# Khắc phục sự cố

| Triệu chứng | Kiểm tra trước | Không nên làm |
| --- | --- | --- |
| Landing 404 /docs | Document root và docs/index.html | Không sửa toàn bộ Caddyfile |
| 502 sau đăng nhập | App, Gateway, Core; log và network | Không tạo lại realm |
| 401 sau callback | Email, header proxy, session, membership | Không giả header |
| Kho trống | Vùng training/live, workspace, volume | Không reset dữ liệu |
| 403 API | Vai trò, model scope, origin | Không cấp owner để bỏ qua lỗi |
| 409 ghi hồ sơ | Version và trạng thái mới nhất | Không tăng version thủ công |
| 423 tải file | Scan pending/blocked, scanner config | Không bỏ kiểm dịch |
| 502 barcode | Open Food Facts, nhập tay | Không tự khẳng định dữ liệu ngoài |
| 503 scanner | Scanner service, token, timeout | Không trả clean giả |

## Lệnh kiểm tra VPS

```bash
cd /opt/dx_trace/selfhost
dc() { docker compose -f compose.yaml -f compose.ubuntu-edge.yaml "$@"; }
dc config --quiet
dc ps
dc logs --since=5m --tail=80 core gateway-api app signin
```

Kiểm hostname và cấu hình đúng trước khi chạy. Không chia sẻ log chưa lọc thông tin bí mật.

## Thu thập thông tin lỗi

Ghi commit, thời điểm, route, HTTP status, vai trò, kho đang chọn, thao tác tái hiện và kết quả mong đợi. Không gửi cookie, token, mật khẩu hoặc hồ sơ thật lên issue.
