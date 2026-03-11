# 📊 Docker 용량 가이드 (스타트업 비용 계산용)

## 🗄️ **각 컴포넌트별 디스크 사용량**

### **Docker 이미지 크기 (다운로드 시)**

| 서비스 | 이미지 크기 | 설명 |
|--------|-------------|------|
| **Redis** | **28MB** | Alpine Linux 기반 (초경량) |
| **Node.js** | **180MB** | Alpine 기반 (풀 버전: 1GB) |
| **PostgreSQL** | **250MB** | Alpine 기준 |
| **Nginx** | **45MB** | Alpine 기준 |
| **전체 합계** | **~500MB** | 압축된 이미지 |

```
💾 실제 디스크 사용:
- 다운로드: 500MB
- 압축 해제 후: ~1.5GB
- 여유 공간 권장: 5GB+
```

---

## 🏃 **런타임 메모리 사용량**

### **개발 환경 (docker-compose.yml)**

```yaml
services:
  redis:
    메모리: 10~50MB      # 거의 없음
    CPU: 1% 미만
    
  backend:
    메모리: 100~200MB    # Node.js + Puppeteer
    CPU: 5~20%          # 크롤링 시 50%+
    
  frontend:
    메모리: 50~100MB     # Vite 개발서버
    CPU: 1~5%
    
전체 합계:
├─ 메모리: 200~350MB
├─ CPU: 10~30%
└─ 디스크: 2~3GB (소스코드 + 이미지)
```

### **프로덕션 환경 (docker-compose.prod.yml)**

```yaml
services:
  redis:
    메모리: 50~256MB     # 캐시 데이터 많아짐
    설정: maxmemory 256mb
    
  backend:
    메모리: 200~512MB    # 크롤링 병렬 처리
    CPU: 크롤링 시 100%
    
  frontend:
    메모리: 20~50MB      # 정적 파일만 서빙
    
전체 합계:
├─ 메모리: 300~800MB
├─ CPU: 평소 10%, 크롤링 시 100%
└─ 디스크: 5~10GB (로그 + 데이터)
```

---

## 💰 **AWS 배포 시 비용 계산**

### **MVP 단계 (월 $20)**

```yaml
인프라:
  EC2 t3.micro:
    사양: 1 vCPU, 1GB RAM
    비용: $8.5/월 (스팟 인스턴스: $3/월)
    
  스토리지:
    EBS 20GB: $2/월
    
  데이터전송:
    100GB/월: $9/월
    
총 비용: ~$20/월
수용능력: 100명 동시 사용자
```

### **성장 단계 (월 $50)**

```yaml
인프라:
  EC2 t3.small:
    사양: 2 vCPU, 2GB RAM
    비용: $17/월
    
  스토리지:
    EBS 50GB: $5/월
    
  데이터전송:
    500GB/월: $25/월
    
총 비용: ~$50/월
수용능력: 1000명 동시 사용자
```

### **확장 단계 (월 $150)**

```yaml
인프라:
  EC2 t3.medium:
    사양: 2 vCPU, 4GB RAM
    비용: $34/월
    
  ElastiCache (Redis):
    cache.t3.micro: $15/월
    
  RDS (PostgreSQL):
    db.t3.micro: $15/월
    
  ALB (로드밸런서):
    $22/월 + 트래픽 비용
    
  스토리지 + 데이터전송:
    $60/월
    
총 비용: ~$150/월
수용능력: 10000명 동시 사용자
```

---

## 📱 **Mac 개발 환경에서의 용량**

### **최소 요구사항**

```
💻 Mac 사양:
├─ macOS: 10.15 (Catalina) 이상
├─ RAM: 8GB (권장: 16GB)
├─ 디스크: 10GB 여유
└─ Docker Desktop: 2GB
```

### **실제 설치 후 용량**

```bash
# Docker Desktop 설치 후
/Applications/Docker.app: 2.5GB
~/Library/Containers/docker: 500MB

# 이미지 다운로드 후
docker images: 500MB

# 컨테이너 실행 후 (볼륨 데이터)
docker volumes: 1~5GB (사용량에 따라 증가)

총합: 5~10GB
```

---

## 🎯 **용량 최적화 전략**

### **1. 이미지 크기 줄이기**

```dockerfile
# ❌ 비효율적 (1GB+)
FROM node:20
RUN apt-get update && apt-get install -y chrome

# ✅ 효율적 (200MB)
FROM node:20-alpine
RUN apk add --no-cache chromium
```

**효과:** 이미지 크기 80% 감소 → 배포 속도 5배 빨라짐

### **2. 멀티 스테이지 빌드**

```dockerfile
# 빌드 스테이지 (빌드에만 필요한 도구)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 프로덕션 스테이지 (최소한만)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**효과:** 빌드 도구 제거 → 이미지 크기 70% 감소

### **3. Redis 메모리 제한**

```yaml
services:
  redis:
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    # 256MB 초과 시 오래된 데이터 자동 삭제
```

**효과:** 메모리 고갈 방지 → 안정적 운영

---

## 🔍 **실제 측정 방법**

### **이미지 크기 확인**

```bash
# 모든 이미지 목록
docker images

# 특정 이미지 상세
docker images redis:alpine --format "{{.Size}}"

# 이미지 히스토리 (레이어 별 크기)
docker history redis:alpine
```

### **컨테이너 사용량 확인**

```bash
# 실시간 모니터링
docker stats

# 출력 예시:
# CONTAINER ID   NAME        CPU %   MEM USAGE / LIMIT
# a1b2c3d4       redis       0.5%    15MiB / 256MiB
# e5f6g7h8       backend     12%     180MiB / 512MiB
```

### **디스크 사용량 확인**

```bash
# Docker 전체 사용량
docker system df

# 출력:
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          5         3         2.5GB     1GB
# Containers      3         3         150MB     0B
# Local Volumes   2         2         500MB     0B
```

### **볼륨 크기 확인**

```bash
# 볼륨 목록
docker volume ls

# 볼륨 상세 (크기 확인하려면 직접 접속)
docker run --rm -v redis_data:/data alpine sh -c "du -sh /data"
```

---

## 📊 **스타트업 단계별 용량 요약**

| 단계 | 도커 이미지 | 런타임 메모리 | 디스크 | 월 비용 |
|------|------------|--------------|--------|---------|
| **개발** | 500MB | 300MB | 5GB | $0 |
| **MVP** | 500MB | 500MB | 10GB | $20 |
| **베타** | 1GB | 1GB | 20GB | $50 |
| **확장** | 2GB | 4GB | 100GB | $150 |
| **성숙** | 5GB+ | 16GB+ | 1TB+ | $500+ |

---

## 💡 **결론: 스타트업에게 Docker는 가볍다!**

### **걱정할 필요 없는 이유:**

1. **이미지 크기 작음**
   - Redis: 28MB (스마트폰 사진 10장 분량)
   - 전체 스택: 500MB (게임 하나 설치하는 정도)

2. **메모리 사용 적음**
   - 개발 시: 300MB (Chrome 탭 3개 분량)
   - Chrome 브라우저가 더 많이 씀!

3. **디스크 여유 있음**
   - Mac 기본 256GB 중 10GB 사용
   - 2.5%밖에 안 됨

### **실제 스타트업 사례:**

```
당근마켓 초기:
- 서버: AWS t3.micro (1GB RAM)
- Docker 이미지: 300MB
- 사용자: 10,000명
- 비용: $20/월

결론: Docker 용량 걱정 NO!
성능 튜닝과 비즈니스에 집중하세요.
```

---

## ❓ **용량 관련 자주 묻는 질문**

**Q: 노트북 SSD가 128GB인데 괜찮을까요?**
- 네! Docker 전체가 10GB면 충분
- 다만 개발할 때는 256GB 이상 권장

**Q: Docker로 인해 노트북이 느려지나요?**
- Mac M1/M2: 거의 차이 없음
- Mac Intel: 약간 느림 (80% 성능)
- Windows: WSL2 사용 시 찮음

**Q: 외장 SSD에 Docker 설치할 수 있나요?**
- 네! 가능
- But 속도가 느려서 비추천
- 내장 SSD 권장

**Q: 클라우드 서버는 얼마나 큰게 필요한가요?**
- MVP: 1GB RAM (t3.micro) - 충분
- 성장: 2GB RAM (t3.small) - 권장
- 확장: 4GB RAM (t3.medium) - 여유있음

---

## 🎯 **지금 확인하기**

```bash
# 1. 현재 디스크 여유 공간 확인
df -h

# 2. Docker 설치 후 용량 확인 (설치 후)
docker system df

# 3. 메모리 사용량 확인 (실행 중일 때)
docker stats
```

**당신의 Mac에 Docker 설치해도 문제없습니다!** 💪
