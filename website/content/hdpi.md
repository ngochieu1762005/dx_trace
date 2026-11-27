<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# H-P-D-I trong DX-TRACE

Một lô sữa chua đã giao đến hai cửa hàng thì bị phát hiện bảo quản sai nhiệt độ. Bốn thành phần H–P–D–I cùng xuất hiện trong cách kho xử lý lô này.

| Thành phần | Biểu hiện trong ứng dụng |
| --- | --- |
| **H · Human · Con người số** | Giao diện theo vai trò, QR, Việc cần làm và thông báo. Danh tính đăng nhập và quyền tại thời điểm quyết định xuất hiện trong Evidence; người lập không được tự duyệt luồng thẩm định. |
| **P · Process · Quy trình số** | BPMN kiểm định, phê duyệt thu hồi và timer/SLA. Core giữ các bất biến kho; Flowable xử lý quy trình thẩm định khi bật overlay. Evidence gắn phiên bản quy trình với quyết định. |
| **D · Data · Dữ liệu số** | Mã lô nối nhà cung cấp, số đo, phiếu giao, điểm nhận và lượng trả. Evidence giữ snapshot đầu vào và nguồn gốc được quan sát; mã sản phẩm không thay thế mã lô. |
| **I · Intelligence · Trí tuệ số** | Quy tắc nhiệt độ phát hiện rủi ro, tính phạm vi thu hồi và lượng còn phải thu để hỗ trợ người có quyền quyết định. Các phép tính này không cần mô hình AI và không tự chứng nhận an toàn thực phẩm. |

Đây là đối chiếu năng lực triển khai với [đề thi PMNM OLP 2026 do VFOSSA công bố, mục 1 về H-P-D-I và mục 4 về bốn nguyên lý](https://vfossa.vn/tin-tuc/de-thi-phan-mem-nguon-mo-olp-2026-798.html), không phải chứng nhận đáp ứng toàn bộ đề thi.

## Một quyết định, bảy thành phần kiểm chứng

Trong **Nhật ký → DX-TRACE Evidence Engine**, quyết định mới có hồ sơ gồm **Identity, Authorization, Policy version, Workflow version, Data lineage, State transition, Integrity proof**. Khóa ký phải được cấu hình khi quyết định được ghi. Tải gói `.tar.gz`, chuyển sang máy không có Core rồi kiểm bằng CLI với khóa công khai hoặc checkpoint nhận độc lập.

Mẫu **RC-2026-001** trên giao diện là dữ liệu giả lập. Nút **Mô phỏng sửa kết quả kiểm định** thay đầu vào và sự kiện; bộ kiểm tại trình duyệt phát hiện chúng không còn khớp manifest. Kết quả minh họa không thay nghiệm thu quyết định thật. [Định dạng và ranh giới tin cậy của Business Decision Proof](../../docs/BUSINESS-DECISION-PROOF.md).

## Bốn nguyên lý và cách quan sát

| Nguyên lý | Cách DX-TRACE thể hiện | Phạm vi cần nói rõ |
| --- | --- | --- |
| **Phân tầng vòng đời dữ liệu** | Số đo gần nhất trong workspace; lịch sử có chỉ mục; xuất tháng đã kết thúc thành JSONL gzip có manifest từ backup nhất quán. | Chưa tự động xóa/chuyển tầng; archive không tự có tính WORM. |
| **Hội tụ IT/OT** | Thiết bị dùng khóa riêng gửi HTTPS `/api/ingest`; kiểm timestamp, ngưỡng và mẫu trùng trước khi cập nhật lô, cảnh báo và cách ly. | Bộ phát dữ liệu mô phỏng được ghi nhãn; thử fixture không chứng nhận phần cứng hay MQTT. |
| **Quản trị nguồn gốc dữ liệu** | Sensor lineage giữ nguồn thiết bị, lô, fingerprint và số đo; Evidence đóng gói dữ liệu quyết định cùng policy/workflow. | Snapshot và chữ ký xác nhận nội dung đã ghi; không chứng minh cảm biến đo đúng hay sự kiện ngoài đời chắc chắn xảy ra. |
| **Zero Trust kết hợp GitOps** | APISIX, khóa gateway/Core riêng, RBAC và tenant tại Core, mạng riêng cho Flowable; cấu hình Compose trong Git được kiểm ở CI. | Đây là quản lý cấu hình mong muốn và cổng kiểm CI; chưa có controller đồng bộ GitOps liên tục. |

[Lệnh và giới hạn quản trị](../../docs/DXOS-GOVERNANCE.md) · [Kịch bản chịu lỗi có thể tái lập](../../docs/FAULT-TOLERANCE.md).

## Cold Chain Digital Twin: thử đúng phạm vi

Một fixture **12,4°C**, ngưỡng cấu hình **8°C**, minh họa kho lạnh có nguy cơ. Để thử trên hệ thống, tạo lô và thiết bị riêng trong kho thực hành, rồi chạy bộ phát HTTPS được ghi nhãn:

```bash
node tools/sensor-client.mjs https://app.example.org/api/ingest 12.4 3 --training-fixture
```

Token của thiết bị thử được cấp qua `DX_DEVICE_TOKEN`, không đặt vào câu lệnh hoặc Git. Ba mẫu liên tiếp vượt ngưỡng trong 10 phút tạo sự cố và cách ly trong giao dịch Core. Bộ phát ghi `synthetic: true`; giao diện Thiết bị và bằng chứng giữ nhãn mô phỏng.

Khi bật `DX_FLOWABLE_URL`, ingestion nối sự cố với **quy trình Flowable thật** bằng danh tính dịch vụ; thiết bị không có quyền duyệt. Nếu engine gián đoạn, API trả `202` với `workflowPending: true` sau khi lưu số đo và giữ lô; quản lý phục hồi bằng `POST /api/quality-recalls/{incident}/sync`. Gửi lại cùng sample ID/body đối chiếu lại quy trình và không tạo thêm số đo/sự cố. Không bật overlay thì chỉ có cách ly tại Core. Hồ sơ ở thời điểm vượt ngưỡng mô tả quy tắc cách ly; hồ sơ kết quả cuối gắn BPMN và lịch sử thực tế lấy từ Flowable.

Đối chiếu lịch sử thiết bị, sự cố, ngưỡng và trạng thái đúng lô; sau đó thực hiện thẩm định bằng tài khoản có quyền. Đây là mô hình trạng thái đơn giản dùng dữ liệu giả lập, chưa phải digital twin vật lý đã hiệu chuẩn. Xem [hướng dẫn cảm biến](sensor-guide.md) và ghi lại commit, ID mẫu, ID lô, trước–sau khi nghiệm thu.

## Theo hồ sơ SUA-005 trong kho thực hành

1. Chọn **Kho thực hành**. Trong **Truy xuất**, tìm SUA-005 và ghi lại mã lô, điểm nhận và các phiếu liên quan. Nếu kho mẫu đã được chỉnh sửa, dùng số đang hiển thị.
2. Trong **Sự cố & thu hồi**, kiểm tra trạng thái duyệt trước khi ghi nhận trả. Với dữ liệu mẫu ban đầu, Long Biên đã nhận 30 hộp và trả 17, Tây Hồ nhận 20 và chưa trả. Còn phải thu **13 + 20 = 33 hộp**.
3. Đối chiếu phiếu giữ 12 hộp tại Thanh Xuân. Hàng vẫn ở kho nên xử lý bằng hủy phiếu chưa giao. Cộng 12 vào 33 sẽ làm sai số hàng đang ở ngoài kho.
4. Mở lịch sử để đối chiếu người thao tác và thời điểm với số lượng từng phiếu. Khi còn điểm nhận chưa trả đủ, giữ hồ sơ mở. Sau khi đóng hồ sơ, kiểm tra lại trạng thái lô trước khi lập phiếu mới.

## Kiểm tra theo vai trò

Dùng hai tài khoản thuộc cùng không gian trên bản có SSO để thử bước lập và thẩm định. Bản demo cục bộ có một danh tính chủ kho, thích hợp cho việc lần theo số liệu. Trong luồng báo kiểm định không đạt qua Quality Portal/Flowable, lô bị cách ly ngay khi Core ghi báo cáo; quyết định thu hồi được chiếu từ kết quả quy trình. Luồng phiếu AppKit cũ vẫn có bước quản lý liên kết kiểm định với sự cố. Khi trình diễn, ghi rõ đang dùng luồng nào.

[Nhập và giao lô](warehouse-guide.md) · [Thiết bị và quy tắc cảnh báo](sensor-guide.md) · [Đóng hồ sơ thu hồi](recall-guide.md) · [Hướng dẫn nghiệm thu](evaluation.md)
