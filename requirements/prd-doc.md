# PowerTech — Tài liệu giải thích dự án (PRD)

> Viết bằng tiếng Việt để cả team dễ hiểu. Dựa trên file
> `SEE 799 - Team Powertech_Sprint 2 Block diagram.docx`.
> Mục tiêu: đọc xong hiểu **dự án làm gì** và **phần Front-end (FE) đang làm gì**.

---

## 1. Dự án này là gì? (giải thích đơn giản)

### Bối cảnh
**PowerTech** là **công ty con của BC Hydro** (tập đoàn điện lực bang British Columbia,
Canada). Công việc của PowerTech là **đánh giá kỹ thuật và vận hành các trạm sạc xe điện
(EV charging stations) ở Canada**.

Hình dung: PowerTech vận hành **nhiều trạm sạc xe điện** rải rác ở nhiều nơi.
Mỗi trạm có nhiều "cổng sạc" (port). Mỗi lần có xe tới sạc thì sinh ra một **phiên sạc
(charging session)** — ghi lại: sạc lúc mấy giờ, bao nhiêu điện (kWh), thu bao nhiêu tiền,
loại đầu sạc gì...

### Vấn đề cần giải quyết
PowerTech cần một **dashboard (bảng điều khiển)** để:

1. **Quản lý & tối ưu việc vận hành** — theo dõi trạm nào chạy tốt/ế, giờ nào cao điểm,
   phân bổ tải điện hợp lý.
2. **Đánh giá các lỗi thường gặp khi vận hành** trạm sạc — phát hiện sớm, giảm thời gian
   chết, biết trạm nào hay hỏng và vì sao.
3. **(Tương lai) Quy hoạch mở rộng** — dùng chính dữ liệu vận hành thu được để quyết định
   **nên xây thêm trạm sạc ở đâu** cho hiệu quả.

→ **PowerTech Dashboard = công cụ giúp đội vận hành ra quyết định dựa trên dữ liệu**, cộng
thêm **AI/Machine Learning** để **dự báo** (nhu cầu điện, nguy cơ hỏng hóc) và **gợi ý**
(vùng nên mở rộng).

> **Tóm gọn 3 mục tiêu:** (1) Vận hành & tối ưu → (2) Chẩn đoán lỗi → (3) Quy hoạch mở rộng.
> Ba mục tiêu này khớp đúng với 6 trang dashboard ở mục 4.

---

## 2. Kiến trúc tổng thể (đọc từ Block Diagram)

Block diagram trong doc mô tả luồng dữ liệu chạy từ trái sang phải, qua 4 khối:

```
[1. INPUT]  →  [2. PRE-PROCESSING]  →  [3. BACKEND: Data Viz & ML Engine]  →  [4. FRONTEND: Dashboard]
  Dữ liệu thô      Làm sạch (ETL)          Phân tích + Mô hình ML                 Hiển thị cho người dùng
```

### Khối 1 — INPUT (Dữ liệu đầu vào)
Dữ liệu thô lấy từ 2 nhóm:

- **Session Logs (nhật ký phiên sạc):** giờ bắt đầu & kết thúc, điện năng (kWh mỗi lần sạc),
  loại cổng (port type), loại phích cắm (plug type), CO₂, doanh thu (revenue), mã khách hàng.
- **Site Registry (danh bạ trạm):** toạ độ GPS, địa chỉ, mã bưu chính (zip), ngày lắp đặt,
  tổng thời gian hoạt động, thời gian sạc.

**Nguồn dữ liệu hiện tại — DÙNG DỮ LIỆU THẬT của City of Boulder:**

Dùng **dataset mở của thành phố Boulder, Colorado** (`open-data.bouldercolorado.gov`) —
**148,136 phiên sạc thật, 50 trạm**. Mỗi phiên có: tên trạm, địa chỉ, ZIP, giờ bắt đầu/kết
thúc, thời lượng, **điện năng (kWh)**, **CO₂ tránh được (GHG kg)**, loại cổng (Level 2).

→ Toàn bộ dashboard chạy trên **số liệu thật**: số trạm, phiên sạc, điện năng, CO₂, thời
lượng TB, heatmap nhu cầu 24×7, trend theo tháng, thống kê từng trạm. Toạ độ trạm không có
sẵn trong dataset nên được **geocode** (Nominatim) một lần.

> 📌 **Không còn số liệu bịa.** Những thứ dataset **không có** (doanh thu, trạng thái
> online/offline, lỗi, mã khách hàng) đã được **bỏ khỏi UI** — vì team chưa có backend cung
> cấp. Khi có backend Python thật, thêm lại bằng cách sửa tầng service (`src/services/api.ts`),
> giao diện giữ nguyên.

> ⚠️ Fault/maintenance vẫn để dành cho **Sprint 3** (trang Fault Diagnostics hiện là stub
> trống, không hiển thị số bịa).

### Khối 2 — PRE-PROCESSING (Tiền xử lý / ETL)
Bằng **Python**. ETL = Extract (trích xuất) → Clean (làm sạch) → Transform (biến đổi) →
Load (nạp). Kết quả là **"Clean Unified Dataset"** — một bộ dữ liệu sạch, thống nhất để
phân tích. (Đây là việc của team Data/Backend, không phải FE.)

### Khối 3 — BACKEND (Data Visualization & ML Engine)
Cũng bằng **Python**. Đây là "bộ não" — chạy phân tích và các mô hình AI:

- **Data Analysis:** xu hướng theo thời gian (ngày/tuần/tháng), thống kê sử dụng, phân tích
  theo mùa, heatmap sử dụng & doanh thu...
- **Demand Forecasting:** dự báo nhu cầu điện theo giờ cho 24–72 giờ tới.
- **Site Scoring & Optimization:** mô hình MCDA (đa tiêu chí) để chấm điểm/xếp hạng trạm,
  tối ưu tải, điểm bền vững, bản đồ vùng thiếu phủ sóng.
- **Fault Detection Model:** phát hiện bất thường, cảnh báo nguy cơ hỏng trong 7 ngày.

### Khối 4 — FRONTEND (Dashboard) ← **ĐÂY LÀ PHẦN CHÚNG TA LÀM**
Trang web hiển thị mọi thứ cho người dùng cuối. Gồm **6 trang**, mỗi trang phục vụ một
**nhóm người dùng (stakeholder)** khác nhau (xem mục 4).

---

## 3. Sprint 2 vs Sprint 3 (làm gì trước, gì sau)

Block diagram chia rõ 2 giai đoạn:

| | **Sprint 2** (làm bây giờ) | **Sprint 3** (làm sau) |
|---|---|---|
| Dữ liệu | Đã có (Palo Alto, Boulder) | Dữ liệu giả lập (synthetic) |
| Trang dashboard | Network Overview, Load Utilization, Performance Analytics | Infrastructure Planning, Sustainability, Fault Diagnostics |
| Lý do | Có sẵn session logs + site registry | Thiếu dữ liệu lỗi/bảo trì/công suất → chờ synthetic |

→ **FE Sprint 2 tập trung 3 trang đầu.** 3 trang sau chỉ dựng khung tạm (stub) chờ Sprint 3.

---

## 4. 6 trang Dashboard & ai dùng (theo doc)

| # | Trang | Dành cho (stakeholder) | Nội dung chính (widget) | Sprint |
|---|-------|------------------------|-------------------------|--------|
| 1 | **Network Overview** (trang chủ) | Tất cả | Thẻ KPI tổng quan, bản đồ trạm, thanh trạng thái hệ thống, bộ lọc thời gian | 2 |
| 2 | **Load Utilization** | Load Manager | Heatmap nhu cầu theo giờ 24×7, dự báo tải 48h, tỉ lệ chiếm cổng, giờ cao điểm | 2 |
| 3 | **Performance Analytics** | Tất cả | Biểu đồ xu hướng KPI, so sánh trạm (điện & tiền), heatmap sử dụng & doanh thu | 2 |
| 4 | **Infrastructure Planning** | Network Planner | Xếp hạng MCDA, bảng điểm ưu tiên, phân tích vùng thiếu phủ, gợi ý mở rộng | 3 |
| 5 | **Sustainability Scoring** | Executive / ESG Officer | Điện đã cấp & khí thải tránh được, cờ tài sản cũ, ước tính bù CO₂, bảng ESG | 3 |
| 6 | **Fault Diagnostics** | Operations Manager | Bảng cảnh báo theo rủi ro, dòng thời gian lỗi, xu hướng MTBF/MTTR, xác suất lỗi | 3 |

*(MTBF = thời gian trung bình giữa 2 lần hỏng; MTTR = thời gian trung bình để sửa xong.)*

---

## 5. FE (Front-end) đang làm gì — hiện trạng

### 5.1. Công nghệ dùng
- **React + Vite + TypeScript** — khung ứng dụng web.
- **Tailwind CSS** — tạo giao diện (màu xanh lá thương hiệu PowerTech, sidebar tối).
- **Recharts** — vẽ biểu đồ đường/cột/donut.
- **ECharts** — vẽ heatmap 24×7.
- **React-Leaflet + OpenStreetMap** — bản đồ trạm sạc.
- **City of Boulder open data** — 148k phiên sạc thật, tổng hợp 1 lần rồi lưu file.
- **TanStack Query** — quản lý việc lấy dữ liệu.

### 5.2. Cách tổ chức dữ liệu (quan trọng)
- **Toàn bộ là dữ liệu THẬT của Boulder**, đã tổng hợp offline vào
  `src/data/boulder-data.json` (script `scripts/fetch-boulder.mjs`). 50 trạm (toạ độ geocode
  1 lần), aggregate theo ngày + heatmap 24×7/trạm.
- Những gì dataset **không có** (doanh thu, online/offline, lỗi) đã **bỏ khỏi UI** — không bịa.

👉 Điểm hay: mọi trang lấy dữ liệu qua **một lớp trung gian** `src/services/api.ts`.
Khi team backend Python làm xong API thật, **chỉ cần sửa 1 file này** để trỏ sang API thật —
**không phải sửa lại giao diện.** (Chi tiết ở mục 7 — Data & Architecture.)

### 5.3. Đã làm xong (đang chạy live)
Deploy tại: **https://power-tech-dashboard.vercel.app** (tự động cập nhật mỗi khi push code).

- ✅ **Bộ khung dashboard**: sidebar 6 trang, header có bộ lọc **Day / Week / Month**,
  responsive (chạy tốt cả điện thoại — sidebar thu thành menu hamburger).
- ✅ **Trang 1 — Network Overview**:
  - 6 thẻ KPI: số trạm mới, phiên đang sạc, tổng phiên, tổng điện (kWh), doanh thu, lỗi.
  - Thanh trạng thái hệ thống (liệt kê trạm offline, có nút đóng).
  - Biểu đồ donut loại đầu sạc (J1772 / CCS / CHAdeMO) — màu tách biệt rõ.
  - Danh sách trạm theo thành phố (Vancouver / Burnaby / Richmond / North Vancouver / Surrey).
  - **Bản đồ toàn mạng lưới**: 180 trạm thật Metro Vancouver (Leaflet + OpenStreetMap), tự
    fit khung để zoom ra thấy hết; chấm xanh = online, đỏ = offline, bấm xem chi tiết.
  - Bộ lọc thời gian **24h / 7 days / 30 days** kèm khoảng ngày cụ thể.
- ✅ **Trang 3 — Performance Analytics**:
  - 4 thẻ chỉ số: thời lượng phiên TB, điện TB/phiên, phiên/ngày, tỉ lệ sử dụng.
  - 2 biểu đồ xu hướng: Điện năng & Doanh thu (đổi theo bộ lọc thời gian).
  - 2 biểu đồ so sánh trạm: theo điện & theo doanh thu.
  - 2 heatmap 24×7: mức sử dụng & doanh thu theo giờ trong tuần.

### 5.4. Đang làm tiếp / còn lại
- ⏳ **Trang 2 — Load Utilization** (Sprint 2, làm tiếp theo): heatmap theo từng trạm +
  bộ chọn trạm, dự báo tải 48h, tỉ lệ chiếm cổng, giờ cao điểm.
- 🔲 **Trang 4, 5, 6** (Sprint 3): hiện là khung tạm ("coming in Sprint 3") vì chờ dữ liệu
  giả lập của Sprint 3.

### 5.5. Tóm tắt vai trò FE trong bức tranh lớn
FE **không** tính toán/AI — việc đó là của backend Python (Khối 2 & 3).
FE chịu trách nhiệm **biến số liệu thành hình ảnh dễ hiểu** (Khối 4): bảng, biểu đồ, bản đồ,
heatmap — để mỗi nhóm người dùng nhìn vào là ra quyết định được.

---

## 6. Bản đồ file trong repo (để dễ tìm)

```
src/
├─ pages/              ← mỗi file = 1 trang dashboard
│  ├─ NetworkOverview.tsx        (trang 1 — xong)
│  ├─ PerformanceAnalytics.tsx   (trang 3 — xong)
│  └─ PlaceholderPage.tsx        (khung tạm cho trang chưa làm)
├─ components/         ← các mảnh giao diện tái dùng (thẻ KPI, donut, bản đồ, charts...)
├─ services/
│  ├─ api.ts           ← LỚP TRUNG GIAN lấy dữ liệu (sau này trỏ sang backend thật)
│  └─ mock-data.ts     ← bộ tạo dữ liệu giả
├─ types/index.ts      ← định nghĩa kiểu dữ liệu (khớp với dữ liệu backend sẽ trả về)
├─ lib/                ← tiện ích (bộ lọc thời gian, format số, query hooks, nav)
└─ layout/             ← khung chung (sidebar, header)
```

---

## 7. Data & Architecture (để trình bày khi chấm)

**Dữ liệu là THẬT, phục vụ ở dạng tĩnh (static) — đây là lựa chọn kiến trúc, không phải đi tắt.**

- **Nguồn thật:** 148,136 phiên sạc thật của City of Boulder (energy, CO₂, thời lượng, thời gian).
- **ETL đúng block diagram:** script `scripts/fetch-boulder.mjs` làm bước **Pre-processing
  (Extract–Clean–Transform–Load)** — tải data thô 80MB, tổng hợp thành file nhỏ
  `src/data/boulder-data.json` (~148KB). FE chỉ **trực quan hoá** (đúng vai trò khối Frontend).
- **Best practice hiệu năng:** không dashboard nào bắt trình duyệt tải 148k dòng rồi tự tính;
  luôn tổng hợp trước. "Static baked aggregate" chính là nguyên tắc đó.
- **Ranh giới data rõ ràng:** mọi trang lấy data qua **một tầng service** (`src/services/api.ts`).
  Đổi sang backend Python thật ⇒ sửa 1 file, không đụng giao diện.
- **Cập nhật data:** thủ công `npm run refresh-data`, hoặc **tự động** bằng GitHub Action chạy
  hằng tuần (`.github/workflows/refresh-data.yml`) → data mới tự commit + Vercel tự deploy.
  Chân sidebar hiển thị **"Data as of <ngày>"**.
- **Không có số liệu bịa:** những gì dataset không có (doanh thu, online/offline, lỗi) đã bỏ
  khỏi UI. Fault Diagnostics + backend live là phạm vi **Sprint 3**.

**Câu nói gọn:** "Dữ liệu là 148k phiên sạc thật của Boulder. Em làm ETL offline để tổng hợp
(đúng khối Pre-processing trong block diagram), FE chỉ trực quan hoá qua một tầng service — khi
có backend Python thật chỉ đổi 1 file. Data có thể refresh thủ công hoặc tự động hằng tuần."
