# DX-TRACE Evidence Engine

**Business Decision Proof** là gói bằng chứng độc lập về một quyết định nghiệp vụ được Core ghi nhận. Nó gắn danh tính, kiểm quyền, chính sách, quy trình, nguồn dữ liệu và thay đổi trạng thái với sự kiện audit có chữ ký. Đây là tính năng **Unreleased**; các archive v0.0.7 không có tính năng này.

[English](en/business-decision-proof.md) · [Kiểm chứng audit cũ](AUDIT-EVIDENCE.md) · [Chịu lỗi](FAULT-TOLERANCE.md) · [H-P-D-I](../website/content/hdpi.md)

## Phạm vi và thời điểm đóng dấu

Core ghi snapshot cùng giao dịch tạo quyết định và sự kiện audit. Khóa Ed25519, nếu đã cấu hình, ký các byte manifest tại thời điểm đó. Khi xuất, máy chủ dùng lại các thành phần đã đóng dấu; không ký lại dữ liệu vừa đọc từ một hồ sơ đã bị sửa. Bản ghi chưa có chữ ký được hiển thị là **Chưa ký tại thời điểm ghi**, không được xuất như bằng chứng đã xác thực. Bật khóa sau đó không tự ký lại lịch sử.

Các loại quyết định được tích hợp gồm tạo/duyệt/đóng sự cố, báo kiểm định không đạt, liên kết kiểm định với sự cố, chiếu kết quả Flowable và cách ly do ba mẫu nhiệt độ liên tiếp vượt ngưỡng. Hồ sơ có trước khi bật Evidence Engine không được dựng lại bằng suy đoán về người, quyền hoặc phiên bản chính sách trong quá khứ. Danh sách API cho biết những hồ sơ thực sự được ghi trong kho hiện tại.

| Thành phần | Nội dung được ràng buộc |
| --- | --- |
| **Identity** | Subject, vai trò, danh tính dùng trong audit và ngữ cảnh xác thực được Core ghi nhận |
| **Authorization** | Quyền thực hiện, workspace và kết quả kiểm cho subject đó |
| **Policy version** | ID, phiên bản, hành động và vai trò/điều kiện chuyển trạng thái của chính sách được chụp |
| **Workflow version** | ID quy trình, phiên bản, fingerprint BPMN, instance/engine và nguồn gốc khi có |
| **Data lineage** | Các nguồn đầu vào được chụp, định danh, nguồn, nội dung hoặc fingerprint |
| **State transition** | Đối tượng, ID và trạng thái trước/sau khác nhau |
| **Integrity proof** | Manifest SHA-256, chuỗi sự kiện, ràng buộc chéo giữa tệp và chữ ký Ed25519 |

Đối với nghiệp vụ chạy trực tiếp trong Core, `workflow.bpmn` là **mô tả quy tắc**, có `isExecutable="false"`; nó không được trình bày như lịch sử chạy Flowable. Khi chiếu kết quả quy trình Flowable, hồ sơ dùng BPMN đã triển khai và lịch sử lấy từ engine. Người kiểm cần đọc trường provenance trước khi suy ra quy trình nào đã thực thi.

## Thiết lập khóa ký

Dùng Node.js 24. Tạo khóa trong **thư mục mới**, ngoài Git:

```bash
node tools/dxtrace.mjs evidence keygen --out /secure/dxtrace-evidence-keys
```

Lệnh tạo `evidence-private.pem` (PKCS8, quyền tệp `0600`) và `evidence-public.pem` (SPKI), không ghi đè thư mục đã tồn tại. Giữ private key trên máy ký; cung cấp public key và fingerprint qua kênh tin cậy riêng cho người kiểm. Private key không được đưa vào archive, commit hoặc ảnh minh họa.

Nếu chạy Core trực tiếp, đặt `DX_EVIDENCE_PRIVATE_KEY_FILE` tới private key. Với Compose, thêm overlay `selfhost/compose.evidence.yaml` cùng các overlay đang dùng và đặt `DX_EVIDENCE_KEY_FILE` thành đường dẫn tuyệt đối trên host. Overlay mount chỉ đọc vào `/run/secrets/dxtrace-evidence.pem` và truyền đường dẫn cho Core. Giữ nguyên project/volume và quy trình backup trong [hướng dẫn vận hành](../selfhost/OPERATIONS.md).

Image chạy bằng user `node`, UID/GID `1000:1000`; tệp bind mount phải đọc được bởi UID này. Nếu keygen chạy dưới root, tệp `0600` mặc định chưa đáp ứng điều đó. Ví dụ chuẩn bị **một tệp mount riêng** bằng quyền root:

```bash
install -d -m 0700 /secure/dxtrace-evidence-mount
install -o 1000 -g 1000 -m 0400 \
  /secure/dxtrace-evidence-keys/evidence-private.pem \
  /secure/dxtrace-evidence-mount/signing.pem
```

Đặt `DX_EVIDENCE_KEY_FILE=/secure/dxtrace-evidence-mount/signing.pem`. Chỉ mount tệp này, không mount cả thư mục khóa. Đối với Docker rootless hoặc UID mapping khác, đối chiếu UID của Core trước khi cấp quyền. Nếu đã cấu hình đường dẫn mà khóa không đọc được hoặc sai định dạng, quyết định cần ký thất bại trước commit; hệ thống không âm thầm tạo bằng chứng giả như đã ký.

Khóa mới chỉ áp dụng cho quyết định mới. Khi xoay khóa, giữ các public key cũ và thời gian áp dụng trong hệ thống quản lý tin cậy của người kiểm. Không thay public key mà không xác nhận nguồn và không coi public key nhúng trong archive là nguồn tin cậy độc lập. Quy trình thu hồi khóa, thời gian tin cậy và lưu WORM nằm ngoài verifier v1.

## Xuất một quyết định

**Giao diện:** chủ không gian hoặc quản lý mở **Nhật ký → DX-TRACE Evidence Engine → Tải danh sách → Tải .tar.gz**. Kho thực hành và kho vận hành là hai phạm vi riêng; giao diện giữ `area=training` khi xuất từ kho thực hành.

**CLI:** xác thực qua phiên đăng nhập của chính người xuất. Đặt `DXTRACE_COOKIE` trong môi trường riêng; không đặt cookie vào tham số hoặc Git. `DXTRACE_URL` phải là origin HTTPS, hoặc HTTP loopback khi thử cục bộ:

```bash
DXTRACE_URL=https://app.example.org DXTRACE_AREA=training \
  node tools/dxtrace.mjs evidence export --id DECISION_ID --out recall-evidence.tar.gz
```

Thay `DECISION_ID` bằng ID nhận từ danh sách. `DXTRACE_AREA=live` là vùng vận hành; biến này mặc định không thêm query training. Lệnh không ghi đè tệp đã tồn tại. Việc tải thành công không có nghĩa đã xác minh độc lập: kết quả export ghi `verified: false`.

| API | Quyền và hành vi |
| --- | --- |
| `GET /api/evidence` | Owner/manager; tối đa 100 quyết định trong đúng workspace, `nextBefore` cho trang tiếp theo qua `?before=...`, trạng thái cấu hình ký |
| `GET /api/evidence/{id}/export` | Owner/manager; chỉ gói đã ký tại thời điểm ghi, phản hồi `application/gzip` |

Không export bằng tài khoản quản trị cơ sở dữ liệu thay cho kiểm quyền workspace của Core. ID của tenant khác không cho phép lấy nội dung hồ sơ đó.

## Tám tệp của gói

| Tệp | Vai trò |
| --- | --- |
| `manifest.json` | Schema, workspace/decision, danh sách hash/kích thước và ràng buộc thành phần |
| `decision.json` | Danh tính, quyền, loại quyết định, trước/sau và sự kiện được tham chiếu |
| `events.jsonl` | Chuỗi audit đến mốc của quyết định; payload giữ đúng chuỗi byte đã băm |
| `policy.json` | Snapshot chính sách và phiên bản |
| `workflow.bpmn` | Nội dung BPMN cùng ràng buộc ID/phiên bản/nguồn gốc trong proof |
| `data-lineage.json` | Các nguồn đầu vào, dữ liệu/fingerprint và workspace |
| `proof.json` | Thuật toán, liên kết thành phần, chuỗi sự kiện và thông tin khóa để kiểm |
| `signature.sig` | Chữ ký Ed25519 64 byte trên manifest canonical có tiền tố phân biệt miền sử dụng |

Schema `dxtrace.business-decision-proof.v1` dùng SHA-256 và Ed25519 từ Node.js. JSON có quy tắc tuần tự hóa xác định; không chấp nhận sửa định dạng rồi suy diễn là cùng byte. Chuỗi audit tính `SHA256(previous + LF + seq + LF + payload)`; số thứ tự tăng, có thể có khoảng trống do revision không tạo sự kiện audit.

Verifier đọc gzip/ustar có giới hạn vào bộ nhớ, **không giải nén ra filesystem**. Nó từ chối tên đường dẫn lạ, liên kết, tệp trùng, tệp thừa, PAX và kích thước vượt giới hạn. Đây là định dạng gói bằng chứng hẹp, không phải trình đọc mọi biến thể tar. Không đóng gói lại bằng một công cụ tùy ý rồi giả định gói vẫn hợp lệ.

Giới hạn v1: archive nén 16 MiB, dữ liệu tar sau giải nén 32 MiB, mỗi tệp 12 MiB và tối đa 100.000 sự kiện. Vượt giới hạn bị từ chối, không cắt ngắn lịch sử rồi đánh dấu hợp lệ.

V1 đóng dấu toàn bộ tiền tố audit đến quyết định. Khi đã bật ký mà snapshot/chuỗi vượt giới hạn, thao tác cần bằng chứng **thất bại trước commit**; không được hiểu là gói lớn sẽ tự chia đoạn hay lịch sử tự được cắt bớt. Cần theo dõi tăng trưởng ledger và nghiệm thu dung lượng theo workload trước vận hành dài hạn. Chia đoạn với checkpoint độc lập chưa được triển khai, nên đây chưa phải bảo đảm mở rộng không giới hạn.

## Xác minh offline

Máy kiểm cần Node.js 24 và các tệp CLI/module từ source tin cậy. `evidence verify` không cần npm install, Core, database, Keycloak hay mạng. Đặt archive và public key đã nhận độc lập lên máy kiểm:

```bash
node tools/dxtrace.mjs evidence verify recall-evidence.tar.gz \
  --public-key /trusted/dxtrace-evidence-public.pem
```

Hoặc dùng **checkpoint manifest đã giữ độc lập**. Checkpoint là SHA-256 của đúng byte `manifest.json`, 64 ký tự hex viết thường; không phải hash của toàn bộ `.tar.gz`:

```bash
node tools/dxtrace.mjs evidence verify recall-evidence.tar.gz \
  --checkpoint MANIFEST_SHA256
```

Có thể cung cấp cả hai để bắt buộc cả key và checkpoint đều khớp. Exit code `0` chỉ khi toàn bộ kiểm tra hợp lệ và có điểm neo tin cậy; `1` khi thiếu điểm neo, sai khóa, sai chữ ký, sai ngữ cảnh hoặc gói bị sửa. Chạy verifier mà không có `--public-key` hoặc `--checkpoint` không được coi là thành công.

Verifier kiểm hash tệp, chữ ký, chuỗi sự kiện, sự kiện gắn với quyết định, workspace, actor, policy/action/role, liên kết BPMN, input lineage và chuyển trạng thái được policy chụp cho phép. Một chữ ký còn hợp lệ **không đủ** nếu dữ liệu trong archive không còn khớp manifest.

Với snapshot chiếu kết quả native Flowable theo policy review v2, verifier còn đối chiếu process instance/business key, BPMN đã triển khai, creator, historic task, completion intent đã ghi và biến `Approved`/`Reviewer`/`Reason` của process. Nó kiểm vai trò người duyệt, chống tự duyệt và đường chấp nhận/từ chối được hỗ trợ. Đây vẫn là kiểm các assertion đã được Core chụp và ký, không phải truy cập engine độc lập khi verify.

## Demo có thể tái lập

```bash
node tools/dxtrace.mjs evidence demo --out /tmp/dxtrace-evidence-demo
node tools/dxtrace.mjs evidence verify /tmp/dxtrace-evidence-demo/recall-evidence.tar.gz \
  --public-key /tmp/dxtrace-evidence-demo/evidence-public.pem
node tools/dxtrace.mjs evidence verify /tmp/dxtrace-evidence-demo/recall-evidence-tampered.tar.gz \
  --public-key /tmp/dxtrace-evidence-demo/evidence-public.pem
```

Lệnh đầu tạo dữ liệu giả lập, khóa tạm trong bộ nhớ, archive nguyên bản, archive sửa kết quả kiểm định, public key và checkpoint. Private key demo không được lưu. Lần verify nguyên bản phải thành công; bản sửa phải trả exit `1`. Key được tạo cùng fixture chỉ phù hợp để kiểm demo; cách phát tệp này không minh họa việc phân phối trust anchor của hệ thống thật.

Mẫu RC-2026-001 trong trình duyệt sử dụng WebCrypto với khóa tạm được giữ riêng trong tab. Nhấn kiểm, sửa kết quả rồi khôi phục. Khi sửa, manifest, event chain và lineage báo lỗi; chữ ký gốc vẫn có thể hợp lệ vì nó xác thực manifest gốc. Nhãn **MÔ PHỎNG** luôn hiển thị. Mẫu trình duyệt không tải hay xác minh archive thật; dùng CLI cho gói xuất từ Core.

## Điều kết quả hợp lệ chứng minh và không chứng minh

Kết quả hợp lệ ràng buộc nội dung snapshot với người nắm private key tương ứng hoặc manifest checkpoint đã được người kiểm tin trước đó. Nó phát hiện sửa tệp, cắt/viết lại chuỗi, thay policy/workflow, đổi input hoặc thay khóa mà không khớp điểm neo. Snapshot được kiểm nhất quán với chính sách đã đóng dấu, không với một chính sách hiện tại chưa được cung cấp.

Nó không tự xác minh người thật đứng sau tài khoản, cảm biến đã hiệu chuẩn, kết quả kiểm định đúng thực tế, máy chủ ký chưa bị chiếm quyền, mọi sự kiện đều được ghi hoặc khóa chưa bị lộ. Core và cơ chế xác thực tại thời điểm capture vẫn thuộc ranh giới tin cậy. Không có witness độc lập, timestamp authority, transparency log hoặc cơ chế thu hồi khóa tích hợp trong v1. Dữ liệu trong archive có thể chứa danh tính và thông tin nghiệp vụ; chuyển giao theo quyền của tổ chức.

## Mã và kiểm thử

```bash
node --test tests/business-evidence.test.mjs tests/evidence-api.test.mjs tests/evidence-demo.test.mjs
```

[Engine](../lib/business-evidence.mjs) · [Bộ đọc archive](../lib/evidence-archive.mjs) · [CLI](../tools/evidence-cli.mjs). Các bài kiểm sử dụng fixture và tấn công sửa gói, không thay kiểm SSO, khóa ký, restore và quyết định thật trên môi trường triển khai.

## Bằng chứng cho ứng dụng AppKit

Trong manifest Application, khai báo `spec.evidence: {signing: required, resources: [maintenance]}`. Chọn `optional` để cho phép ghi trạng thái unsigned khi chưa có khóa. Mỗi tài nguyên phải có workflow và quyền approve. Core chụp model đang thực thi, hồ sơ trước/sau và lệnh chuyển bước, rồi lưu cùng audit và revision trong một transaction. CLI xác minh bằng cách chạy lại quy tắc của model với vai trò, người thao tác và thời gian đã ghi. Khóa required thiếu hoặc sai khiến quyết định bị từ chối trước commit. Để kiểm gói AppKit, dùng bản cài CLI đầy đủ.

## Bàn giao sau bảo trì

Manifest Maintenance khai báo `spec.handover: {provider: flowable, resource: maintenance, after: done}`. Sau khi hồ sơ hoàn tất, người tạo mở biên bản bàn giao từ portal. Flowable giữ trạng thái bàn giao và kết quả kiểm tra kỹ thuật, vật tư và phê duyệt cuối. Trạng thái sửa chữa thuộc AppKit. API của biên bản kiểm tra quyền đọc model và hồ sơ trong workspace cho từng thao tác. Tắt overlay Flowable sẽ ẩn thao tác bàn giao trong portal.
