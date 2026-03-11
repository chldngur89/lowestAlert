# LowestAlert

상품 상세 URL을 등록하면 가격 변동을 추적하고, 설정한 기준 이상 가격이 내려갔을 때 알림을 보여주는 Vite + React PWA입니다.

이번 정리에서 결제/가짜 데이터/별도 Express 서버 의존을 걷어내고, Vercel 배포에 맞는 구조로 단순화했습니다.

## 현재 동작 방식

- 프런트엔드: Vite + React + Zustand
- 상태 저장: 브라우저 `localStorage`
- 실시간 가격 조회: Vercel Serverless Functions (`/api/analyze`, `/api/compare`)
- 지원 입력: 상품 상세 URL

검색어 기반 쇼핑몰 비교보다, 실제 배포에서 안정적으로 동작하는 URL 기반 추적에 집중했습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 열면 됩니다.

## Vercel 배포

이 프로젝트는 정적 프런트엔드와 `api/` 서버리스 함수로 구성되어 있어 Vercel에 바로 올릴 수 있습니다.

### 권장 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### 환경 변수

기본값으로 같은 도메인의 `/api` 를 사용하므로 필수 환경 변수는 없습니다.

선택적으로 별도 API 도메인을 쓸 경우:

```bash
VITE_API_BASE_URL=https://your-domain.vercel.app
```

## 핵심 화면

- `/`: 온보딩
- `/home`: 추적 중인 상품 목록
- `/add`: 상품 URL 등록
- `/product/:id`: 가격 이력과 수동 갱신
- `/alerts`: 가격 하락 알림
- `/settings`: 브라우저 알림, 기준값, 테마
