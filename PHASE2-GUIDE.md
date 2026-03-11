# LowestAlert - Phase 2 구현 가이드

## 🎯 Phase 2: PostgreSQL + Prisma + 서버 스케줄러 구현

### **구현된 기능:**
- ✅ PostgreSQL 데이터베이스 연동
- ✅ Prisma ORM 설정
- ✅ 자동 가격 추적 (30분마다)
- ✅ 푸시 알림 (가격 하락 시)
- ✅ RESTful API 확장

---

## 🚀 빠른 시작

### **1. PostgreSQL 설치 (Docker 권장)**

```bash
# Docker로 PostgreSQL 실행
docker-compose up -d postgres

# 또는 로컬 PostgreSQL 설치
# Mac: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
```

### **2. 환경변수 설정**

`server/.env` 파일 수정:
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/lowestalert?schema=public"
```

### **3. Prisma 설정**

```bash
cd server

# Prisma Client 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev --name init

# (선택) Prisma Studio 실행
npx prisma studio
```

### **4. 서버 실행**

```bash
cd server
npm install  # node-cron, @prisma/client 설치
npm run dev
```

### **5. Frontend 실행**

```bash
cd ..
npm run dev
```

---

## 📁 새로 생성된 파일들

### **Backend**
```
server/
├── prisma/
│   └── schema.prisma       # DB 스키마 정의
├── src/
│   ├── services/
│   │   ├── database.ts     # DB 연동 서비스
│   │   ├── scheduler.ts    # 30분마다 자동 크롤링
│   │   └── notifications.ts # FCM 푸시 알림
│   └── index.js            # 확장된 API 라우트
├── .env                    # DATABASE_URL 추가
└── prisma-setup.sh         # Prisma 초기화 스크립트
```

### **Docker**
```
docker-compose.yml          # PostgreSQL + Backend
```

---

## 📡 새로운 API 엔드포인트

### **상품 관리**
```
GET    /api/products          # 모든 상품 조회
POST   /api/products          # 상품 생성
POST   /api/products/:id/update-price  # 가격 업데이트
DELETE /api/products/:id      # 상품 삭제
```

### **알림**
```
GET  /api/alerts              # 읽지 않은 알림 조회
POST /api/alerts/:id/read     # 알림 읽음 처리
```

### **크롤링**
```
POST /api/analyze             # URL 분석
POST /api/compare             # 가격 비교
```

---

## 🔧 데이터베이스 스키마

### **Product (상품)**
- id, name, shop, currentPrice, originalPrice
- change, isLowest, image, userId
- createdAt, updatedAt
- Relations: priceHistory[], alerts[]

### **PriceHistory (가격 이력)**
- id, productId, price, shop, timestamp

### **Alert (알림)**
- id, productId, productName, oldPrice, newPrice
- discount, shop, timestamp, isRead, userId

### **User (사용자)**
- id (Firebase UID), email, name, fcmToken

---

## ⏰ 자동 크롤링 스케줄러

**동작 방식:**
1. 서버 시작 시 스케줄러 자동 실행
2. 30분마다 모든 상품 크롤링
3. 가격 변동 시 자동으로 DB 업데이트
4. 5% 이상 하락 시 푸시 알림 발송

**로그 확인:**
```
[Scheduler] Starting auto-crawl at 2024-01-15T10:00:00.000Z
[Scheduler] Found 4 products to crawl
[Scheduler] Crawling: 삼성 갤럭시 버즈2 프로
[Scheduler] Updated 삼성 갤럭시 버즈2 프로: 189000원
```

---

## 🔔 푸시 알림 설정 (선택사항)

### **Firebase 설정**
1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. "새 비공개 키 생성" 클릭
3. 다운로드한 JSON 파일을 `server/firebase-service-account.json`으로 저장

**알림 발송 조건:**
- 가격이 5% 이상 하락했을 때
- 사용자가 FCM 토큰을 등록했을 때

---

## 🐳 Docker로 한번에 실행

```bash
# 모든 서비스 시작 (PostgreSQL + Backend)
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 중지
docker-compose down
```

---

## ⚠️ 주의사항

1. **Prisma Client 생성 필수**: `npx prisma generate`
2. **데이터베이스 마이그레이션**: `npx prisma migrate dev`
3. **환경변수 확인**: `DATABASE_URL`이 올바르게 설정되어야 함
4. **PostgreSQL 실행 중**: DB가 실행되지 않으면 서버가 시작되지 않음

---

## 📝 다음 단계 (Phase 3)

- [ ] Redis 캐싱 (크롤링 결과 1시간 캐시)
- [ ] Winston 로깅
- [ ] 에러 모니터링 (Sentry)
- [ ] API Rate Limiting
- [ ] 더 많은 쇼핑몰 지원

**완료!** 이제 서버에서 자동으로 상품 가격을 추적하고, 가격 하락 시 알림을 볃송합니다.
