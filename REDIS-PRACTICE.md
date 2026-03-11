# 🎯 Redis 실전 테스트 가이드

## 1단계: Redis 실행 (한 줄 명령)

```bash
# 스크립트로 자동 실행
./start-redis.sh

# 또는 직접 Docker로 실행
docker run -d --name lowestalert-redis -p 6379:6379 redis:alpine
```

**성공 시 출력:**
```
✅ Redis 실행 완료!
📊 Redis 상태:
redis_version:7.2.4

🎯 테스트:
성공!
```

---

## 2단계: Redis CLI로 직접 놀아보기

```bash
# Redis 접속
redis-cli

# ========== 기본 테스트 ==========

# 1. 간단한 저장/조회
SET 내이름 "홍길동"
GET 내이름
# → "홍길동"

# 2. 숫자 증가 (조회수 카운트)
SET 상품1_조회수 0
INCR 상품1_조회수  # 1
INCR 상품1_조회수  # 2
INCR 상품1_조회수  # 3
GET 상품1_조회수
# → "3"

# 3. 만료 시간 설정 (임시 데이터)
SET 임시쿠폰 "COUPON123"
EXPIRE 임시쿠폰 300  # 5분 후 자동 삭제
TTL 임시쿠폰
# → 298 (초 남음)

# 4. 우리 프로젝트처럼 사용하기
# 상품 정보 저장
HSET 상품:1 이름 "갤럭시버즈" 가격 189000 쇼핑몰 "쿠팡"
HSET 상품:2 이름 "에어팟프로" 가격 289000 쇼핑몰 "11번가"

# 상품 목록 조회
KEYS 상품:*
# → 상품:1, 상품:2

# 특정 상품 조회
HGETALL 상품:1
# → 이름: 갤럭시버즈, 가격: 189000, 쇼핑몰: 쿠팡

# 5. 실제 크롤링 캐시처럼 사용
SET 크롤링결과:갤럭시버즈 '{"price":189000,"shop":"쿠팡"}'
GET 크롤링결과:갤럭시버즈
# → {"price":189000,"shop":"쿠팡"}

# 나가기
exit
```

---

## 3단계: 우리 프로젝트에서 Redis 확인

### **Backend 서버 실행**

```bash
cd server
npm run dev
```

**기대 출력:**
```
🚀 Server running on http://localhost:3001
📡 Crawler Mode: local-browser
⚡ Redis Cache: Enabled
📡 Endpoints:
   POST /api/analyze        - Analyze product URL
   POST /api/compare        - Compare prices (CACHED)
   ...
[Redis] Connected successfully
```

### **Redis 캐시 확인**

```bash
# 새 터미널 열기
redis-cli

# 현재 저장된 키 확인 (처음엔 없음)
KEYS *
# → (empty array)

# 이제 브라우저에서 http://localhost:5174 접속
# /home 페이지 들어가면 자동 크롤링 시작

# 다시 Redis 확인
KEYS *
# → crawl:갤럭시버즈2프로
# → crawl:에어팟프로
# → crawl:lg그램
# → crawl:다이슨v15

# 특정 상품 캐시 확인
GET crawl:갤럭시버즈2프로
# → {"results":[{"price":189000,...}],"timestamp":...}

# 만료 시간 확인
TTL crawl:갤럭시버즈2프로
# → 3572 (초, 약 59분 남음)
```

---

## 4단계: 성능 비교 테스트

### **캐시 없을 때 (첫 요청)**

```bash
# API 호출 시간 측정
curl -w "\nTime: %{time_total}s\n" \
  -X POST http://localhost:3001/api/compare \
  -H "Content-Type: application/json" \
  -d '{"productName":"갤럭시버즈2프로"}'

# 출력:
# {"success":true,"data":[...],"meta":{"cacheHit":false,...}}
# Time: 5.234s  ← 크롤링해서 느림
```

### **캐시 있을 때 (두 번째 요청)**

```bash
# 똑같은 요청 다시 복사

curl -w "\nTime: %{time_total}s\n" \
  -X POST http://localhost:3001/api/compare \
  -H "Content-Type: application/json" \
  -d '{"productName":"갤럭시버즈2프로"}'

# 출력:
# {"success":true,"data":[...],"meta":{"cacheHit":true,...}}
# Time: 0.012s  ← Redis에서 바로 가져옴! ⚡
```

**🎉 400배 빨라짐! (5.2초 → 0.012초)**

---

## 5단계: 캐시 통계 확인

```bash
# 브라우저 또는 curl로 확인
curl http://localhost:3001/api/cache/stats

# 응답:
{
  "success": true,
  "data": {
    "keys": 4,        # 캐시된 상품 수
    "memory": "2.3M"  # 사용 중인 메모리
  }
}
```

---

## 6단계: 캐시 수동 관리

```bash
# 1. 특정 상품 캐시 삭제 (새로 크롤링하고 싶을 때)
curl -X POST http://localhost:3001/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"productName":"갤럭시버즈2프로"}'

# 2. 모든 캐시 삭제
curl -X POST http://localhost:3001/api/cache/clear

# 3. Redis CLI에서 직접 삭제
redis-cli
DEL crawl:갤럭시버즈2프로
# 또는
FLUSHALL  # ⚠️ 전체 삭제 (주의!)
```

---

## 🐛 문제 해결

### **문제 1: "Redis connection refused"**
```bash
# 원인: Redis가 실행 안 됨
# 해결:
docker ps  # 실행 중인지 확인
docker start lowestalert-redis  # 실행되지 않았다면 시작
```

### **문제 2: "ECONNREFUSED 127.0.0.1:6379"**
```bash
# 원인: Redis 포트가 닫혀있음
# 해결:
docker run -d -p 6379:6379 --name lowestalert-redis redis:alpine
```

### **문제 3: 캐시가 안 됨 (계속 MISS)**
```bash
# 원인 확인
redis-cli MONITOR
# → 실시간으로 Redis 명령 확인

# 서버 로그 확인
cd server && npm run dev
# → [Redis Cache] SET / HIT 로그 확인
```

---

## 📊 성능 비교표

| 테스트 | 시간 | 속도 |
|--------|------|------|
| 첫 크롤링 (캐시 없음) | 5~8초 | 🐢 느림 |
| 캐시 히트 | 0.01초 | 🚀 번개 |
| Redis 조회 | 0.001초 | ⚡ 빛의 속도 |

---

## 🎯 다음 단계

1. ✅ **Redis 실행 완료**
2. ✅ **캐싱 확인 완료**
3. 🔄 **서버 성능 테스트**
4. 🔄 **Docker Compose로 통합**

**모든 테스트 완료!** 🎉
