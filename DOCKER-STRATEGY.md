# 🐳 Docker 전략 가이드: 개발부터 배포까지

## 왜 Docker인가? (미래를 위한 선택)

### ❌ Docker 안 쓰는 경우의 미래
```
개발 (Mac + Homebrew Redis)
    ↓
스테이징 테스트 (Linux 서버 - Redis 직접 설치)
    ↓
"로컬에서는 되는데 서버에서는 에러..."
    ↓
환경 설정 디버깅: 3일 소요 😱
    ↓
프로덕션 배포 (또 다른 Linux)
    ↓
"또 에러? 의존성 버전이 다륻네"
    ↓
추가 디버깅: 2일 소요
```

### ✅ Docker 쓰는 경우의 미래
```
개발 (Docker Compose: Redis + Backend + Frontend)
    ↓
스테이징 테스트 (같은 Docker Compose)
    ↓
"똑같이 잘 돌아감!" ✅
    ↓
프로덕션 배포 (Docker Compose)
    ↓
"바로 배포 완료!" 🎉
```

**결론**: 처음 30분 투자로 나중에 5일 절약

---

## 🚀 완전 통합 Docker Compose

### 전체 아키텍처
```
🖥️ 당신의 Mac
    ↓
🐳 Docker Desktop
    ├─ 🟥 Redis (캐시)
    ├─ 🟦 Backend (Node.js + Puppeteer)
    └─ 🟨 Frontend (Vite + React)
    
모든 서비스가 격리된 컨테이너에서 실행
→ 개발 환경 = 프로덕션 환경
```

---

## 📦 설치 순서

### 1단계: Docker Desktop 설치 (10분)

```bash
# Mac용 Docker Desktop 다운로드
# https://www.docker.com/products/docker-desktop

# 또는 Homebrew로 설치
brew install --cask docker

# 설치 후 실행
open /Applications/Docker.app

# 확인
docker --version
# → Docker version 24.0.x
```

**왜 Docker Desktop?**
- ✅ GUI로 컨테이너 관리 가능
- ✅ Kubernetes 내장 (향후 확장)
- ✅ Mac/Windows/Linux 모두 지원
- ✅ 물리 서버 배포 시에도 동일한 명령어 사용

---

### 2단계: 전체 스택 한 번에 실행

```bash
# 프로젝트 루트로 이동
cd /Users/wh.choi/Desktop/Code/lowestAlert

# 전체 스택 실행 (Redis + Backend + Frontend)
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 또는 특정 서비스만
docker-compose logs -f backend
```

**실행되는 서비스:**
- 🔴 Redis: localhost:6379
- 🔵 Backend: http://localhost:3001
- 🟨 Frontend: http://localhost:5173

---

### 3단계: 개발 워크플로우

#### **코드 수정 시 (Hot Reload)**
```bash
# Frontend 코드 수정 → 자동 반영 (Vite HMR)
# Backend 코드 수정 → 자동 재시작 (nodemon)
# Redis 데이터 → 영구 저장 (볼륨 마운트)
```

#### **데이터베이스 확인**
```bash
# Redis CLI 접속
docker-compose exec redis redis-cli

# 명령어 실행
KEYS *
GET crawl:갤럭시버즈2프로
```

#### **로그 확인**
```bash
# 실시간 로그
docker-compose logs -f

# Backend만
docker-compose logs -f backend

# Redis만
docker-compose logs -f redis
```

---

## 🛠️ 주요 명령어 치트시트

### **실행/중지**
```bash
# 전체 시작
docker-compose up -d

# 전체 중지
docker-compose down

# 데이터 볼륨까지 완전 삭제
docker-compose down -v

# 특정 서비스만 재시작
docker-compose restart backend
```

### **상태 확인**
```bash
# 실행 중인 컨테이너
docker-compose ps

# 리소스 사용량
docker stats

# Redis 정보
docker-compose exec redis redis-cli INFO
```

### **디버깅**
```bash
# Backend 컨테이너 안으로 들어가기
docker-compose exec backend sh

# Redis 직접 조작
docker-compose exec redis redis-cli

# 환경변수 확인
docker-compose exec backend env
```

---

## 📊 개발 vs 프로덕션

### **개발 환경 (지금)**
```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./server:/app  # 코드 실시간 반영
    command: npm run dev  # 개발 모드
    
  frontend:
    volumes:
      - .:/app  # 코드 실시간 반영
    command: npm run dev -- --host
```

### **프로덕션 환경 (나중)**
```yaml
# docker-compose.prod.yml
services:
  backend:
    volumes: []  # 소스 복사만
    command: npm start  # 프로덕션 모드
    
  frontend:
    volumes: []  # 빌드된 파일만
    command: serve -s dist  # 정적 파일 서빙
    
  nginx:
    image: nginx:alpine  # 리버스 프록시
    ports:
      - "80:80"
      - "443:443"
```

**배포 시:**
```bash
# 프로덕션용 실행
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎯 실전 시나리오

### **시나리오 1: 새 팀원 온보딩**

**기존 방식 (Homebrew):**
```
1. Mac 준비 (1일)
2. Homebrew 설치 (30분)
3. Redis 설치 (30분)
4. Node.js 설치 (20분)
5. Backend 의존성 설치 (10분)
6. Frontend 의존성 설치 (10분)
7. 환경변수 설정 (30분)
8. 에러 디버깅 (2시간)
    ↓
총 소요: 2일
```

**Docker 방식:**
```
1. Docker Desktop 설치 (10분)
2. git clone
3. docker-compose up -d (5분)
    ↓
총 소요: 20분 🎉
```

### **시나리오 2: 서버 배포**

**AWS EC2 배포:**
```bash
# 서버 접속
ssh ubuntu@server-ip

# Docker 설치
curl -fsSL https://get.docker.com | sh

# 코드 받기
git clone https://github.com/your-repo/lowestalert.git
cd lowestalert

# 실행
docker-compose -f docker-compose.prod.yml up -d

# 끝! 🎉
```

**완벽히 동일한 환경:**
- 개발할 때 쓰던 Redis 버전
- 개발할 때 쓰던 Node.js 버전
- 개발할 때 쓰던 모든 설정

---

## 💰 비용 분석

### **개발 단계**
| 항목 | 비용 | 설명 |
|------|------|------|
| Docker Desktop | **묣로** | 개인용 |
| 개발 서버 | $0 | 로컬 Mac |
| **총계** | **$0** | - |

### **프로덕션 단계 (월간)**
| 항목 | Docker 사용 | Docker 미사용 |
|------|-------------|---------------|
| 서버 비용 | $20 (t3.small) | $60 (t3.large) |
| 설정/디버깅 | 2시간 | 20시간 |
| 인건비 (@$50/hr) | $100 | $1000 |
| **총 비용** | **$120** | **$1060** |

**Docker로 연간 $11,000 절약!** 💵

---

## 🎓 배운 내용 요약

### **Docker를 써야 하는 이유**
1. ✅ **환경 일치**: 개발 = 테스트 = 프로덕션
2. ✅ **빠른 온보딩**: 신규 개발자 20분만에 시작
3. ✅ **쉬운 배포**: 서버에 Docker만 있으면 OK
4. ✅ **비용 절약**: 효율적인 리소스 사용
5. ✅ **미래 보장**: 업계 표준 (Kubernetes 기반)

### **지금 해야 할 일**
1. ⬇️ Docker Desktop 설치 (10분)
2. 🚀 `docker-compose up -d` (5분)
3. ✅ http://localhost:5173 접속

### **나중을 위한 준비**
- docker-compose.yml → 프로덕션용 수정
- AWS/GCP 계정 생성
- 도메인 구매
- CI/CD 파이프라인 (GitHub Actions)

---

## 📖 다음 단계

### **바로 실행해보기**
```bash
# 1. Docker 설치
brew install --cask docker

# 2. Docker 실행
open /Applications/Docker.app

# 3. 프로젝트 실행
cd /Users/wh.choi/Desktop/Code/lowestAlert
docker-compose up -d

# 4. 확인
docker-compose ps
```

### **학습 로드맵**
1. **Week 1**: Docker 기초 (컨테이너, 이미지 개념)
2. **Week 2**: Docker Compose 심화 (네트워크, 볼륨)
3. **Week 3**: CI/CD 파이프라인 (GitHub Actions)
4. **Week 4**: 클라우드 배포 (AWS ECS/EKS)

---

## ❓ 자주 묻는 질문

**Q: Docker가 느리지 않나요?**
- Mac에서는 약간 느림 (성능 80%)
- Linux에서는 거의 차이 없음 (성능 98%)
- 개발용으론 충분히 빠름

**Q: Docker 안 깔고 개발할 수 없나요?**
- 가능합니다! (현재 상태로 계속)
- 하지만 배포 시 꼭 필요함
- 팀 프로젝트 시 꼭 필요함

**Q: 어디까지 Docker로 할까요?**
- 지금: Redis만 (시작)
- 1주 후: Backend도 추가
- 1달 후: Frontend도 추가
- 배포 시: 전체 스택

**Docker 설치하고 시작할까요?** 🐳
