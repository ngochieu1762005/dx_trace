# Hướng dẫn nghiệm thu và trình diễn

## Checklist đánh giá

| Kịch bản | Bằng chứng đạt |
| --- | --- |
| Cài mới từ mã nguồn | Commit/tag, lệnh cài, service health |
| Hai ứng dụng chung Core | Portal và App truy cập cùng hồ sơ theo quyền |
| SSO | Hai user thực, phiên hết hạn, role denial |
| Cách ly và thu hồi | Lô bị chặn, phiếu hủy/nhận trả, số còn phải thu |
| AppKit | Plan, install, biểu mẫu, workflow, audit |
| Bundles | Một model sai → toàn gói từ chối, retry không trùng |
| Data governance | Trường điều kiện, profile theo quyền |
| Audit | Verify hợp lệ, checkpoint lưu riêng |
| Backup | Phục hồi riêng và đối chiếu nghiệp vụ |
| Supply chain | License MIT, release, SBOM và checksum |

## Kịch bản 15 phút

- 2 phút: kiến trúc và ranh giới tin cậy.
- 4 phút: truy xuất lô và xử lý thu hồi.
- 3 phút: Quality Portal và hai tài khoản.
- 3 phút: AppKit v2, plan/apply và hồ sơ.
- 2 phút: audit, CI, release và backup.
- 1 phút: giới hạn và kế hoạch phát triển.

Không dùng dữ liệu thật để chứng minh lỗi bảo mật. Ghi commit, môi trường, điều kiện đo, kết quả đạt/chưa đạt. Không dùng kết quả benchmark loopback để suy ra sức chịu tải production. [Kịch bản demo](../../docs/DEMO.md) · [Ma trận minh chứng](../../docs/EVIDENCE.md) · [Acceptance](../../docs/ACCEPTANCE-2026.md).

## Một phép thử có thể lặp lại

Ghi commit, vùng kho, vai trò, mã lô và số lượng ban đầu. Với một phiếu giữ hàng trên lô đang hoạt động, lập kiểm định rồi cách ly lô bằng tài khoản có quyền. Thử xác nhận giao phiếu đang giữ. Ghi lại phản hồi, trạng thái phiếu và lượng hàng sau lần thử. Chỉ kết luận lệnh chặn giao đạt khi cả trạng thái và số lượng đều đúng. [Theo dõi cả bốn thành phần HDPI](hdpi.md).
