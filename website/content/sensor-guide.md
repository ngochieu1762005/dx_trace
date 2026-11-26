# Thiết bị và giám sát nhiệt độ

## Cấp khóa

Owner hoặc manager tạo thiết bị gắn với một lô. Khóa thiết bị chỉ được trả một lần. Lưu ở thiết bị hoặc secret store, không đưa vào frontend hoặc Git.

## Gửi số đo

Endpoint POST /api/ingest nhận Bearer token và JSON có id, temperature, recorded. Nhiệt độ phải là số hữu hạn từ -100 đến 150 °C. Thời điểm phải nằm trong cửa sổ 10 phút so với server.

```bash
read -rsp 'Device token: ' SENSOR_TOKEN
echo
RECORDED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ID=$(cat /proc/sys/kernel/random/uuid)
curl --fail-with-body https://app.example.org/api/ingest \
  -H "Authorization: Bearer $SENSOR_TOKEN" \
  -H 'Content-Type: application/json' \
  --data "{\"id\":\"$ID\",\"temperature\":4.5,\"recorded\":\"$RECORDED\"}"
unset SENSOR_TOKEN
```

Thay hostname khi triển khai. Retry cùng ID và payload; không sinh ID mới chỉ vì mất phản hồi.

## Cảnh báo

Ba số đo gần nhất trong cửa sổ 10 phút đều vượt khoảng bảo quản có thể mở sự cố high và cách ly lô nếu chưa có sự cố mở. Mất cập nhật trên 15 phút tạo cảnh báo. Đây là luật nghiệp vụ, không phải hệ thống dự báo nhiệt độ.

## Kiểm thử và thu hồi khóa

Kiểm lịch sử phân trang, gửi số đo trùng, số đo quá cũ và thu hồi khóa. Sau thu hồi, yêu cầu bằng khóa cũ bị từ chối. Không gửi số đo thử vào thiết bị production.

## Khi bảng theo dõi thiếu một số đo

Đối chiếu thiết bị và mã lô trước, sau đó so thời điểm đo với đồng hồ máy chủ. Nếu thiết bị mất mạng ngay sau khi gửi, giữ nguyên ID, nhiệt độ và thời điểm rồi gửi lại trong cửa sổ tiếp nhận. Ghi nhận kết quả trước khi tạo phép đo kế tiếp. Một mẫu gửi lại nhiều lần không đại diện cho ba lần đo ngoài ngưỡng.

Để đọc cảnh báo, mở hồ sơ lô và đối chiếu ngưỡng bảo quản của chính lô này với chuỗi số đo gần nhất. Cảnh báo mất cập nhật cho biết thiếu dữ liệu mới; muốn kết luận nhiệt độ thực tế cần có số đo.
