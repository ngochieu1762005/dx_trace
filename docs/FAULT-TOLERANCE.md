<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Chứng minh DX-TRACE chịu lỗi

Mục tiêu là giữ đúng bất biến nghiệp vụ khi yêu cầu lặp, người dùng thao tác đồng thời hoặc một thành phần bị gián đoạn. Các bài kiểm sử dụng dữ liệu tổng hợp và môi trường cô lập; kết quả phải đi cùng commit và lệnh chạy. CI xanh không tự chứng minh VPS đã nghiệm thu. [English](en/fault-tolerance.md).

## Mười kịch bản cần đối chiếu

| Kịch bản | Bất biến phải giữ | Bài kiểm / bằng chứng thực thi |
| --- | --- | --- |
| Gửi cùng yêu cầu nhiều lần | Cùng key và input trả lại kết quả đã cam kết; đổi input dưới cùng key bị từ chối; không nhân đôi giao dịch | `warehouse-idempotency` kiểm sau 601 lệnh mới; `platform-api`, `selfhost`, `package-lifecycle`, `native-review-recovery` |
| Hai người phê duyệt đồng thời | Chỉ một quyết định cho một task/version; người lập không tự duyệt; bên thua phải đọc lại trạng thái | `evidence-api`, `platform-api`, `quality-portal`, `native-review-recovery` |
| Kiểm định viên truy cập sai kho | Quyền và workspace được kiểm ở Core; ID không mở quyền truy cập | `quality-portal`, `native-review-recovery` |
| Truy cập tenant khác | Không liệt kê, đọc hay thay đổi hồ sơ của tenant khác | `selfhost`, `platform-api`, `package-lifecycle`, `reliable-outbox` |
| Flowable mất kết nối | Core giữ cách ly; intent bền vững, retry đối chiếu history trước khi làm lại; không đoán kết quả | `native-review-recovery`, `cold-chain-workflow`; kiểm engine thật ở workflow `third-party-core.yml` |
| Worker chết giữa giao dịch/gửi | Rollback không để lại sự kiện nửa vời; audit đã commit còn trong outbox; lease hết hạn có thể nhận lại | `reliable-outbox` dùng SQLite thật và worker bị `SIGKILL` |
| Sửa nhật ký hoặc bằng chứng | Verify phát hiện sai tệp, chuỗi, ràng buộc hoặc trust anchor | `audit-proof`, `business-evidence`; `evidence-demo` kiểm mẫu trình duyệt |
| Upload mẫu EICAR | Có scanner: từ chối trước khi ghi object; scanner lỗi: trả 503; chưa scan: không tải công khai | `upload-faults`, `platform-assurance`; scanner HTTP/TCP được giả lập, ClamAV thật cần nghiệm thu riêng |
| App khai báo quyền không hợp lệ | Core từ chối cài đặt trước khi tăng revision hoặc tạo quyền | `package-lifecycle`, `appkit`, `appkit-api` |
| Upgrade app thất bại | Phiên bản đang dùng và dữ liệu cũ vẫn hợp lệ; rollback hợp lệ không làm mất hồ sơ | `package-lifecycle`, `application-bundle`, `platform-storage` |

Các tên ở bảng tương ứng `tests/<tên>.test.mjs`. Đọc assertion của bài kiểm và log tại commit đang đánh giá; không dùng tên bài kiểm làm bằng chứng cho điều nó chưa chạy. EICAR là mẫu kiểm thử chống mã độc, không cần đưa mẫu này lên dịch vụ công khai hoặc kho vận hành.

## Transactional outbox và worker phục hồi

Core dùng một giao dịch SQLite cho cập nhật được bảo vệ bởi revision, audit và những bản ghi liên quan. Trigger `AFTER INSERT` của `audit_ledger` đưa sự kiện vào outbox trong cùng giao dịch. Nếu giao dịch rollback, cả audit lẫn outbox đều không có sự kiện đó. Nếu commit xong rồi worker chết, hàng đợi vẫn còn.

Worker nhận một sự kiện bằng lease **30 giây** và token riêng cho lần nhận. Acknowledgement hoặc cập nhật lỗi phải khớp token; worker cũ thức lại sau khi lease được cấp cho worker khác không thể xác nhận thay cho lần xử lý mới. Hai worker cạnh tranh không cùng giữ lease hợp lệ của một sự kiện tại một thời điểm.

Gửi webhook là **at least once**: bên nhận có thể đã commit nhưng phản hồi bị mất, do đó retry có thể gửi lại. Header `x-dx-event-id` giữ ổn định dạng `workspace:seq`; bên nhận cần ghi receipt/deduplicate ID này trong giao dịch của họ. Không tuyên bố exactly once qua ranh giới Core và dịch vụ bên ngoài.

Retry tối đa **12 lần**, backoff bắt đầu **5 giây**, tăng theo cấp số nhân và giới hạn **1 giờ**. Sự kiện vượt số lần thử chuyển sang `dead`; lease của lần cuối hết hạn cũng không làm nó mất khỏi hệ thống. Dead letter cần được quan sát và xử lý, không bị coi là đã giao.

| API vận hành | Quyền / điều kiện |
| --- | --- |
| `GET /api/outbox` | Owner/manager, chỉ đúng workspace; trả số lượng trạng thái và dead letters |
| `POST /api/outbox/{seq}/retry` | Owner; body `{ "expectedAttempts": 12 }` phải dùng số lần thử vừa đọc thực tế |

Trước khi retry dead letter, kiểm nguyên nhân thất bại, khả năng nhận và receipt của đích. `expectedAttempts` là điều kiện chống thao tác trên bản ghi đã đổi, không phải một giá trị cố định luôn bằng 12. Sau retry, theo dõi sự kiện đến `delivered` hoặc `dead`; không xóa hàng đợi để làm dashboard hết lỗi.

## Flowable: phân biệt chưa gửi và không biết đã gửi thành công

Core và Flowable không chung transaction. Một timeout sau POST có thể xảy ra khi engine đã nhận lệnh. Vì vậy hệ thống lưu intent và business key trước side effect, rồi dùng lịch sử engine để đối chiếu. Nếu đã có instance/task hoàn tất với cùng thông tin, retry trả trạng thái đã ghi nhận. Nếu không đủ bằng chứng, hệ thống trả lỗi cần đối soát, giữ lô trong trạng thái an toàn và không gửi một lệnh bắt đầu mới một cách mù quáng.

Quyết định hoàn thành task lưu intent theo `workspace + task`, ràng buộc subject, role và nội dung quyết định. Cùng key/task nhưng người khác hoặc nội dung khác không được biến thành retry hợp lệ. Khi response bị mất, phải tìm đúng historic task và các biến quyết định để khôi phục kết quả. Claim của engine và kiểm quyền Core phối hợp ngăn hai người hoàn thành cùng task theo hai kết quả khác nhau.

Trường hợp bắt đầu quy trình có kết quả không rõ và history chưa tìm thấy vẫn cần đối soát thủ công; không thể dùng một lần truy vấn không thấy để chứng minh engine chưa commit. Bài `native-review-recovery` chèn lỗi bằng phản hồi HTTP giả lập; workflow tích hợp riêng chạy Flowable thật. Không đánh đồng hai cấp kiểm chứng này.

## Idempotency và optimistic locking

Client phải giữ cùng idempotency key, body và workspace cho retry của cùng một thao tác. Tạo key mới sau timeout có thể biến yêu cầu thành thao tác mới; chỉ làm vậy khi đã biết kết quả cũ. Receipt/fingerprint ngăn dùng lại key với dữ liệu khác. Optimistic locking yêu cầu revision/version đúng, nhờ đó cập nhật dựa trên dữ liệu cũ bị 409 thay vì âm thầm ghi đè.

Khi nhận 409, tải lại bản ghi, tìm kết quả của yêu cầu trước, đối chiếu actor/state/version rồi mới quyết định thao tác tiếp. Khóa trong bộ nhớ theo workspace giảm tranh chấp trong một process; ràng buộc SQLite, revision và lease mới bảo vệ dữ liệu giữa các process.

## Tệp tải lên và vòng đời ứng dụng

`upload-faults` gửi mẫu EICAR qua API upload thật tới scanner HTTP trong bài kiểm. Nó xác nhận verdict bị chặn **trước `BUCKET.put`**, scanner unavailable trả 503 không ghi object, và tệp chưa scan không được tải về. Vì scanner trong bài kiểm là fixture, chỉ có thể khẳng định Core xử lý verdict và lỗi đúng; để khẳng định ClamAV phát hiện EICAR phải chạy overlay thật với signature đã nạp trong môi trường cô lập. [Scanner](PLATFORM-ASSURANCE.md).

AppKit kiểm permission khai báo trước cài đặt. Bài `package-lifecycle` thử quyền ngoài allowlist, upgrade schema không tương thích, version stale, rollback và giữ dữ liệu. Upgrade lỗi không có nghĩa cần chạy một bản sửa dữ liệu âm thầm; phiên bản đang hoạt động phải tiếp tục dùng được. [AppKit](APPKIT.md).

## Chạy kiểm tra

Từ gốc repo, sau khi cài dependency và build:

```bash
node --test tests/reliable-outbox.test.mjs tests/native-review-recovery.test.mjs \
  tests/warehouse-idempotency.test.mjs tests/cold-chain-workflow.test.mjs \
  tests/upload-faults.test.mjs tests/package-lifecycle.test.mjs \
  tests/business-evidence.test.mjs tests/evidence-api.test.mjs tests/quality-portal.test.mjs \
  tests/platform-api.test.mjs tests/selfhost.test.mjs
```

Chạy toàn bộ suite trước merge thay đổi chức năng theo [CONTRIBUTING](../CONTRIBUTING.md). Kiểm tra tích hợp container theo [CI](../.github/workflows/ci.yml) và [APISIX–Flowable](../.github/workflows/third-party-core.yml). Không cần thêm microservices hoặc Kubernetes để có các bất biến này.

## Ghi nhận nghiệm thu thật

Mỗi lần nghiệm thu cần: commit, cấu hình đang bật, môi trường, workspace thử, request/task/sample ID, trạng thái trước/sau, mã HTTP, audit/outbox/Evidence tương ứng và log đã loại bí mật. Cho mỗi sự cố, kiểm cả phản hồi lẫn dữ liệu tồn tại sau restart.

Các thử nghiệm cục bộ không thay thế gián đoạn container thật, SSO với hai tài khoản, restore toàn stack, scanner thật, mất điện máy chủ hoặc đo tải. Chỉ đánh dấu một kịch bản đã đạt trên VPS khi có bằng chứng chạy ở đúng môi trường đó. [Hướng dẫn nghiệm thu](ACCEPTANCE-2026.md) · [Business Decision Proof](BUSINESS-DECISION-PROOF.md).
