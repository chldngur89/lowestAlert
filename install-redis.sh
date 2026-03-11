#!/bin/bash

echo "🚀 Redis 설치 및 실행 스크립트"
echo "================================"
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Homebrew 확인
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew가 설치되어 있지 않습니다.${NC}"
    echo ""
    echo "설치 방법:"
    echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo -e "${GREEN}✅ Homebrew 확인 완료${NC}"
echo ""

# Redis 설치 여부 확인
if command -v redis-cli &> /dev/null; then
    echo -e "${GREEN}✅ Redis가 이미 설치되어 있습니다!${NC}"
else
    echo -e "${YELLOW}📦 Redis 설치 중...${NC}"
    echo "(1~2분 소요됩니다)"
    echo ""
    
    brew install redis
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Redis 설치 완료!${NC}"
    else
        echo -e "${RED}❌ Redis 설치 실패${NC}"
        exit 1
    fi
fi

echo ""

# Redis 실행
if brew services list | grep redis | grep -q "started"; then
    echo -e "${GREEN}✅ Redis가 이미 실행 중입니다!${NC}"
else
    echo -e "${YELLOW}🚀 Redis 실행 중...${NC}"
    brew services start redis
    
    # 시작 대기
    sleep 2
fi

echo ""

# 연결 테스트
echo -e "${YELLOW}🔍 Redis 연결 테스트...${NC}"
if redis-cli ping | grep -q "PONG"; then
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}🎉 Redis 실행 완료!              ${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "📊 버전 정보:"
    redis-cli INFO server | grep redis_version
    echo ""
    echo "🎯 테스트:"
    redis-cli SET 설치테스트 "성공!"
    echo "입력: SET 설치테스트 '성공!'"
    
    RESULT=$(redis-cli GET 설치테스트)
    echo "출력: GET 설치테스트 → $RESULT"
    echo ""
    echo "💡 유용한 명령어:"
    echo "  redis-cli          # Redis 접속"
    echo "  redis-cli ping     # 연결 확인"
    echo "  redis-cli monitor  # 실시간 모니터링"
    echo ""
    echo "🛑 종료 방법:"
    echo "  brew services stop redis"
    echo ""
    echo "🗑️  완전 삭제:"
    echo "  brew uninstall redis"
else
    echo -e "${RED}❌ Redis 연결 실패${NC}"
    echo "로그 확인: brew services logs redis"
    exit 1
fi
