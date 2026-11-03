# หลัง Clone Repo แล้วต้องทำยังไง

โปรเจกต์ Book / Review / Tag: **Nest.js (backend, port 3001)** + **Next.js (frontend, port 3000)**

> หลัง clone ต้อง **ติดตั้ง package ใหม่ทั้ง backend และ frontend** เพราะ `node_modules` ไม่ได้ถูก push ขึ้น repo
> ชื่อโฟลเดอร์ `backend` / `frontend` เป็นไปตามคู่มือ ถ้า repo ของคุณตั้งชื่อต่างกันให้แก้ตาม

---

## สรุปแบบสั้น

```bash
git clone <url-ของ-repo>
cd <ชื่อโฟลเดอร์-repo>

# เทอร์มินัล 1: backend
cd backend
npm install
npm run start:dev

# เทอร์มินัล 2: frontend
cd frontend
npm install
# สร้างไฟล์ .env.local ใส่ NEXT_PUBLIC_API=http://localhost:3001
npm run dev
```

เปิด **http://localhost:3000** (เว็บ) และ **http://localhost:3001/docs** (Swagger)

---

## Step 1 Clone และเช็คเครื่อง

```bash
git clone <url-ของ-repo>
cd <ชื่อโฟลเดอร์-repo>

node -v    # ควรเป็น Node 20 ขึ้นไป (LTS)
npm -v
```

ยังไม่มี Node: โหลดรุ่น **LTS** จาก https://nodejs.org (หรือ `nvm install --lts`) แล้วเปิดเทอร์มินัลใหม่

---

## Step 2 รัน Backend (เทอร์มินัล 1)

```bash
cd backend
npm install          # ถ้ามี package-lock.json จะใช้ npm ci แทนก็ได้
npm run start:dev
```

- รอจนเห็น log `Mapped {...} route` แล้วเปิด **http://localhost:3001/docs** (Swagger UI) ได้
- ไฟล์ฐานข้อมูล `dev.db` และโฟลเดอร์ `uploads/` จะถูกสร้างให้เองตอนรันและตอนอัปโหลดครั้งแรก (เพราะตั้ง `synchronize: true`)
- **ไม่ต้องตั้ง `.env` ฝั่ง backend**

---

## Step 3 รัน Frontend (เทอร์มินัล 2)

```bash
cd frontend
npm install
```

สร้างไฟล์ `frontend/.env.local` (ไฟล์นี้ไม่ถูก commit) ใส่บรรทัดเดียว:

```
NEXT_PUBLIC_API=http://localhost:3001
```

แล้วรัน:

```bash
npm run dev
```

เปิด **http://localhost:3000**

> - Windows PowerShell: อย่าสร้าง `.env.local` ด้วย `echo ... > .env.local` เพราะ encoding อาจผิด ให้สร้างด้วย editor แล้วพิมพ์บรรทัดนั้นแทน
> - ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` แก้แล้วต้อง **หยุดแล้วรัน `npm run dev` ใหม่** ถึงจะมีผล

---

## Step 4 ลองใช้งาน

ฐานข้อมูลจะ **ว่างเปล่า** เพราะ `dev.db` และ `uploads/` ไม่ได้อยู่ใน repo ให้เริ่มจาก:

1. `/tags/new` เพิ่ม Tag 2 อัน
2. `/books/new` เพิ่มหนังสือ + ติ๊ก Tag + เลือกปก
3. เข้าหน้ารายละเอียดหนังสือ → "+ เขียนรีวิว" → ใส่รูป
4. ลองแก้ไข / ลบ แล้วเช็คว่า Review หายตามหนังสือ แต่ Tag ยังอยู่

---

## ไฟล์ที่ไม่ควรอยู่ใน repo (`.gitignore`)

ถ้าไม่ได้ใส่ไว้ ฐานข้อมูลและรูปที่อัปโหลดตอนทดสอบจะหลุดขึ้น repo

```gitignore
# backend/.gitignore
node_modules
dist
dev.db
uploads/*

# frontend/.gitignore
node_modules
.next
.env.local
```

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `npm install` ของ backend error ที่ `sqlite3` | ลอง `npm rebuild sqlite3` หรือเปลี่ยนไปใช้ `better-sqlite3` (`npm i better-sqlite3` แล้วแก้ `type: 'better-sqlite3'` ใน `app.module.ts`) |
| `EADDRINUSE` port 3001 หรือ 3000 ถูกใช้อยู่ | ปิดโปรเจกต์เก่าที่ยังรันอยู่ หรือเปลี่ยน port |
| หน้าเว็บโหลดรายการไม่ขึ้น / CORS error | เช็คว่า backend รันอยู่ และ `main.ts` มี `enableCors({ origin: 'http://localhost:3000' })` |
| เรียก API ไปผิดที่ (`undefined/books`) | ยังไม่ได้สร้าง `.env.local` หรือสร้างแล้วลืมรัน `npm run dev` ใหม่ |
| แก้ entity แล้วตารางไม่ตรง / error ตอนเริ่ม | ลบไฟล์ `backend/dev.db` แล้วรันใหม่ (เฉพาะช่วง dev) |
| รูปที่เคยอัปโหลดไม่ขึ้นหลัง clone | ปกติ เพราะไฟล์ใน `uploads/` ไม่ได้ถูก commit ให้อัปโหลดใหม่ |
| Swagger เปิดไม่ได้ | เช็คว่า backend รันสำเร็จ (ไม่มี error สีแดงใน terminal) และเข้า `http://localhost:3001/docs` |

---

## Checklist หลัง clone

- [ ] `node -v` เป็น 20 ขึ้นไป
- [ ] `cd backend && npm install` สำเร็จ
- [ ] `npm run start:dev` ไม่มี error และเปิด `/docs` ได้
- [ ] `cd frontend && npm install` สำเร็จ
- [ ] สร้าง `frontend/.env.local` แล้ว
- [ ] `npm run dev` แล้วเปิด `http://localhost:3000` เห็นหน้ารายการหนังสือ
- [ ] เพิ่ม Tag / หนังสือ + ปก / รีวิว + รูป ได้ครบ
