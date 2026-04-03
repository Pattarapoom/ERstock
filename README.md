# ER Medical Stock Management 🏥

ระบบบริหารจัดการคลังเวชภัณฑ์ออนไลน์ สำหรับหน่วยงานห้องฉุกเฉิน (ER) เพื่อเพิ่มประสิทธิภาพในการบริหารจัดการยาและอุปกรณ์ทางการแพทย์ให้เป็นระบบ และสามารถซิงค์ข้อมูลแบบ Real-time ได้ทันที

## ✨ ฟีเจอร์หลัก (Features)
- 💾 **Real-time Synchronization** โดยใช้ Firebase Realtime Database
- 📊 **Dynamic Dashboard** แสดงสถิติการเบิกจ่ายและรายการยาค้างคลังให้เห็นแบบปัจจุบัน
- 📷 **Barcode Scanner** มีตัวสแกนในตัวเพื่อสะดวกในการเบิก-จ่ายเวชภัณฑ์
- ⏳ **FIFO Logic** ระบบตรวจเช็คและคัดยาที่ใกล้หมดอายุขึ้นมาแสดงผลก่อน (First In, First Out)
- 🔔 **Inventory Alerts** ระบบเตือนเมื่อสต็อกเวชภัณฑ์ต่ำกว่าจุดสั่งซื้อหรือเมื่อยาใกล้หมดอายุ

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** Vanilla HTML, JavaScript, CSS (Tailwind CSS)
- **Database:** Firebase Realtime Database
- **Icons & Library:** Lucide Icons, Html5-QRCode (สแกนบาร์โค้ด), Animate.css

## 🚀 วิธีการติดตั้ง (Installation)
1. คัดลอกโปรเจกต์ (Clone) ลงในเครื่องของคุณ:
   ```bash
   git clone [your-repository-url]
   ```
2. แก้ไขไฟล์ `app.js` โดยใส่ **Firebase Configuration** ของคุณ
3. เปิดไฟล์ `index.html` ผ่าน Live Server (เช่น VS Code Extension หรือ Python http server)

---

สร้างขี้นเพื่อช่วยเหลือการทำงานของบุคลากรทางการแพทย์ (Nursing & ER Units) 🌡️👨‍⚕️🧤
