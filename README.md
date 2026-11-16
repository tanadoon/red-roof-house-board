# Red Roof House Board (Next.js + Supabase Hybrid)

ระบบแทรกกิ้งงานรายเดือนสไตล์ Kanban Board (To Do, In Progress, Review, Done) ที่ออกแบบมาให้ใช้งานคนเดียวได้คล่องตัวที่สุด พร้อมระบบ **Hybrid Storage**:
- **เริ่มใช้งานได้ทันที (LocalStorage Mode):** ไม่ต้องรอตั้งค่า Database ก็สร้างงาน ลากวาง และกรองตามเดือนได้ทันที
- **ซิงค์ขึ้น Cloud ได้ทุกเมื่อ (Supabase Mode):** เมื่อนำ URL และ Anon Key จาก Supabase มาใส่ (ผ่านหน้าเว็บหรือไฟล์ `.env.local`) ระบบจะสลับไปใช้ฐานข้อมูลจริงบน Cloud และมีปุ่มกดอัปโหลดงานเดิมจากเครื่องขึ้น Cloud ได้ในคลิกเดียว

---

## วิธีเปิดใช้งานทันที (ไม่ต้องติดตั้งอะไรเพิ่ม)
คุณสามารถดับเบิลคลิกเปิดไฟล์ [`preview.html`](./preview.html) ในเบราว์เซอร์เพื่อทดลองใช้งานบอร์ดจริงได้ทันที (รองรับทั้งโหมด LocalStorage และการเชื่อมต่อ Supabase Cloud เหมือนตัวเต็มทุกประการ)

---

## วิธีรันโปรเจกต์ Next.js เต็มรูปแบบ (สำหรับพัฒนาต่อหรือเอาขึ้น Vercel)

1. ติดตั้ง **Node.js LTS** (หากในเครื่องยังไม่มี สามารถรัน `winget install OpenJS.NodeJS.LTS` ใน PowerShell ได้เลย)
2. เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรัน:
   ```bash
   npm install
   npm run dev
   ```
3. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## วิธีตั้งค่า Supabase Database (ฟรี)
1. ไปที่ [supabase.com](https://supabase.com) แล้วกด **New Project**
2. ไปที่เมนู **SQL Editor** ด้านซ้าย แล้วคัดลอกโค้ดทั้งหมดจากไฟล์ [`supabase/schema.sql`](./supabase/schema.sql) ไปวางแล้วกด **Run**
3. ไปที่ **Project Settings -> API** คัดลอก `Project URL` และ `anon public key`
4. นำมาใส่ได้ 2 ช่องทาง:
   - **ใส่ผ่านหน้าเว็บได้เลย:** กดปุ่ม **"ตั้งค่า Cloud DB"** มุมขวาบนของบอร์ด วาง URL และ Key แล้วกดบันทึก (พร้อมกดปุ่ม *"ซิงค์งานจากเครื่องขึ้น Supabase"* ได้ทันที)
   - **ใส่ในไฟล์ `.env.local` (สำหรับเอาขึ้น Vercel):** คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่าตัวแปรตามตัวอย่าง
