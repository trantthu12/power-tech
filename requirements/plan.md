# Plan FE — PowerTech Dashboard (Sprint 2)

> Nguồn requirements: `requirements/SEE 799 - Team Powertech_Sprint 2 Block diagram.docx`
> Giải thích dự án (tiếng Việt): `requirements/prd-doc.md`
> Inspire UI: dashboard PowerPump (sidebar tối + KPI cards + donut charts + map)
> **Cách làm:** đi từng bước nhỏ — làm 1 phần → review → làm tiếp.

---

## Trạng thái tổng quan (cập nhật mới nhất)

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 0 | Scaffold + layout shell | ✅ Xong |
| 1 | Mock data + service layer | ✅ Xong |
| 2 | Network Overview (landing) | ✅ Xong — live |
| 3 | Performance Analytics | ✅ Xong — live |
| 4 | **Load Utilization** | ⏭️ **Đang làm tiếp** |
| 5 | Stubs Sprint 3 (3 trang) | ✅ Khung tạm xong |

- **Repo:** https://github.com/trantthu12/power-tech (branch `main` + `develop`)
- **Live:** https://power-tech-dashboard.vercel.app (tự deploy mỗi lần push `main`)
- **Responsive + mobile-friendly:** ✅

---

## Tóm tắt requirements (phần FE)

- **6 trang dashboard**, mỗi trang gắn với một stakeholder:
  1. **Network Overview** (landing) — KPI cards, station map, system status banner, filter — *All stakeholders*
  2. **Load Utilization** — heatmap 24×7, dự báo 48h, load optimization, port occupancy, peak hourly — *Load Manager*
  3. **Performance Analytics** — trend charts, site comparison, utilization/revenue heatmap — *All stakeholders*
  4. **Infrastructure Planning** — MCDA ranking, priority table, coverage gap, expansion — *Network Planner*
  5. **Sustainability Scoring** — energy & avoided emissions, ageing asset flags, CO₂ offset, ESG — *Executive / ESG Officer*
  6. **Fault Diagnostics** — risk-ranked alerts, fault timeline, MTBF/MTTR trends, fault probability — *Operations Manager*
- **Data model:** Session Logs (start/end, kWh, port/plug type, CO₂, revenue, customer ID) + Site Registry (GPS, address, zip, date, duration). Nguồn: Palo Alto & Boulder open data (Mỹ) — vì Canada không có open data (xem prd-doc.md).
- Data fault/maintenance/capacity **chưa có** → synthetic ở Sprint 3 → Fault Diagnostics & forecast thật dồn Sprint 3.

## Ánh xạ 3 mục tiêu dự án → 6 trang
- **Vận hành & tối ưu** → Network Overview, Load Utilization, Performance Analytics (Sprint 2)
- **Chẩn đoán lỗi** → Fault Diagnostics (Sprint 3)
- **Quy hoạch mở rộng** → Infrastructure Planning, Sustainability (Sprint 3)

---

## Quyết định kỹ thuật (thực tế đã dùng)

| Hạng mục | Chọn | Ghi chú |
|---|---|---|
| Framework | React 19 + Vite + TypeScript (SPA) | Dashboard nội bộ, không cần SSR |
| UI | Tailwind CSS v4 + component tự viết | Không dùng shadcn CLI (tự build để kiểm soát) |
| Charts | Recharts (line/bar/donut) + ECharts (heatmap) | Tắt animation Recharts cho render ổn định |
| Map | react-leaflet + OpenStreetMap | Free, không cần key |
| Data trạm | **Open Charge Map** (trạm thật Metro Vancouver) | Lấy 1 lần → `src/data/ocm-sites.json`; key trong `.env`, không vào bundle |
| Data fetching | TanStack Query + `services/api.ts` | Mock ↔ API thật swap chỉ sửa 1 file |
| Deploy | Vercel (Git integration, branch `main`) | `vercel.json` rewrite cho SPA routing |

**Quyết định về map (đã chốt):** map hiển thị **toàn bộ mạng lưới PowerTech** (180 trạm thật
Vancouver), nhất quán với KPI/donut/city. Đã cân nhắc và **bỏ** chế độ "near-me / live theo vị
trí" vì đây là ops-dashboard nội bộ (xem toàn mạng lưới), không phải app cho tài xế. Trạm =
thật (OCM); session/kWh/doanh thu = giả lập gắn lên trạm thật.

---

## Các phase

### Phase 0 — Skeleton ✅
Scaffold Vite+React+TS+Tailwind+Router; layout shell (sidebar tối 6 trang, header filter day/week/month); theme green brand + navy.

### Phase 1 — Mock data layer ✅
Types theo doc (`ChargingSession`, `Site`, `FaultRecord`); **sites = 180 trạm thật OCM Metro
Vancouver** (`src/data/ocm-sites.json`); generator có seed sinh ~90 ngày sessions + faults
synthetic gắn lên các trạm thật; `services/api.ts` + `services/mock-data.ts`.

### Phase 2 — Network Overview ✅ (live)
KPI cards (energy/sessions/revenue/users/stations/faults); system status banner (có nút đóng,
"+N more"); donut connector types (màu tách biệt, kiểm định CVD); locations by city; **map
Leaflet hiển thị toàn mạng lưới 180 trạm thật Vancouver, auto-fit**; filter 24h/7d/30d + hiện
khoảng ngày.

### Phase 3 — Performance Analytics ✅ (live)
4 stat tiles (avg duration, avg energy/session, sessions/day, utilization); 2 trend area chart (energy & revenue theo filter); 2 site comparison bar chart (energy & revenue); 2 heatmap 24×7 (utilization & revenue, ECharts).

### Phase 4 — Load Utilization ⏭️ (ĐANG LÀM — chia 4 bước nhỏ)
- **Bước 1:** Heatmap 24×7 + **site selector** (chọn 1 trạm → heatmap đổi theo trạm).
- **Bước 2:** 4 thẻ chỉ số (port occupancy %, peak hour, peak load, tổng điện hôm nay).
- **Bước 3:** Biểu đồ **dự báo tải 48h** (mock = moving average + noise; Sprint 3 thay model Python).
- **Bước 4:** Bảng **tối ưu tải** (gợi ý giờ nên giãn sạc).

### Phase 5 — Stubs Sprint 3 ✅
Infrastructure Planning, Sustainability, Fault Diagnostics: route + khung "coming in Sprint 3".

---

## Việc có thể làm thêm (backlog, chưa ưu tiên)
- Lazy-load ECharts để giảm bundle (~1.9MB) — landing nhẹ lại, heatmap chỉ tải khi cần.
- Fix nhẹ: KPI dùng `new Date()` cho range nên số liệu hơi trôi giữa các lần load (mock).
- (Đã xong) Tích hợp Open Charge Map cho map — dùng trạm thật Vancouver.
