#!/bin/bash

echo "🚀 Redis 시작 스크립트"
echo "======================"
echo ""

# 방법 1: Homebrew (Mac)
if command -v brew &> /dev/null; then
    echo "✅ Homebrew 발견!"
    echo "Redis 시작 중..."
    brew services start redis
    sleep 2
    
    # 연결 테스트
    if redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis 실행 완료!"
        echo ""
        echo "📊 Redis 상태:"
        redis-cli info server | grep redis_version
        echo ""
        echo "🎯 테스트:"
        redis-cli SET 테스트 "성공!"
        redis-cli GET 테스트
        echo ""
        echo "💡 종료하려면: brew services stop redis"
        exit 0
    fi
fi

# 방법 2: Docker
echo "Docker로 Redis 실행 시도..."
if command -v docker &> /dev/null; then
    echo "✅ Docker 발견!"
    
    # 이미 실행 중인지 확인
    if docker ps | grep -q "redis"; then
        echo "✅ Redis가 이미 실행 중입니다!"
        docker exec -it $(docker ps -q -f name=redis) redis-cli ping
        exit 0
    fi
    
    # 새로 실행
    echo "Redis 컨테이너 실행 중..."
    docker run -d \
        --name lowestalert-redis \
        -p 6379:6379 \
        redis:alpine \
        --appendonly yes
    
    sleep 3
    
    # 연결 테스트
    if docker exec lowestalert-redis redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis 실행 완료!"
        echo ""
        echo "📊 Redis 상태:"
        docker exec lowestalert-redis redis-cli info server | grep redis_version
        echo ""
        echo "🎯 테스트:"
        docker exec lowestalert-redis redis-cli SET 테스트 "성공!"
        docker exec lowestalert-redis redis-cli GET 테스트
        echo ""
        echo "💡 종료하려면: docker stop lowestalert-redis"
        exit 0
    fi
fi

echo "❌ Redis를 시작할 수 없습니다."
echo ""
echo "설치 방법:"
echo "1. Mac: brew install redis"
echo "2. Docker: docker run -d -p 6379:6379 redis:alpine"
echo "3. Ubuntu: sudo apt-get install redis-server"
