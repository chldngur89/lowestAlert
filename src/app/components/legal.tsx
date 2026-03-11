import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export function Legal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">법적 정보</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="font-bold text-lg mb-4">이용약관</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p><strong>제1조 (목적)</strong><br/>이 약관은 LowestAlert(이하 "서비스")가 제공하는 온라인 서비스의 이용조건 및 절차에 관한 사항을 규정합니다.</p>
            <p><strong>제2조 (서비스의 제공)</strong><br/>서비스는 사용자에게 최저가 정보 알림, 가격 추적 등의 서비스를 제공합니다.</p>
            <p><strong>제3조 (회원가입)</strong><br/>회원은 서비스를 이용하기 위해 필요한 최소한의 정보를 제공해야 합니다.</p>
            <p><strong>제4조 (서비스 이용제한)</strong><br/>회원이 다음 각 호의 사유에 해당하는 경우, 서비스 제공자는 서비스 이용을 제한할 수 있습니다.</p>
            <p><strong>제5조 (면책사항)</strong><br/>서비스는 외부 쇼핑몰에서 제공하는 정보의 정확성과 실시간성을 보장하지 않습니다.</p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="font-bold text-lg mb-4">개인정보처리방침</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p><strong>수집하는 개인정보 항목</strong><br/>- 이름, 이메일 (소셜 로그인 시)<br/>- 서비스 이용 기록<br/>- 기기 정보</p>
            <p><strong>개인정보의 수집 및 이용목적</strong><br/>서비스 제공 및 품질 개선, 사용자 인증</p>
            <p><strong>개인정보의 보유 및 이용기간</strong><br/>회원 탈퇴 시까지</p>
            <p><strong>개인정보 보호 책임자</strong><br/>LowestAlert 팀 (contact@lowestalert.com)</p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="font-bold text-lg mb-4">전자상거래법 준수</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>본 서비스는 통신판매중개자로서 통신판매 당사자가 아니며, 판매되는 상품의 거래 정보 및 품질 등에 대해 책임을 지지 않습니다.</p>
            <p>소비자 보호를 위해 전자상거래법이 정하는 사항을 준수합니다.</p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="font-bold text-lg mb-4">정보 안내</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>본 서비스에서 제공하는 모든 정보는 시장 조사 및 공개된 데이터를 기반으로 합니다.</p>
            <p>가격 정보는 실시간으로 변동될 수 있으며, 서비스 사용 전 직접 해당 쇼핑몰을 확인하시기 바랍니다.</p>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-4">
          최종 수정일: 2026년 2월 24일<br/>
          LowestAlert
        </p>
      </div>
    </div>
  );
}
