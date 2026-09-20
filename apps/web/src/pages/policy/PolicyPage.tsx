import { Link } from "react-router-dom";

type PolicySection = {
  items?: readonly string[];
  paragraphs?: readonly string[];
  title: string;
};

type PolicyPageProps = {
  description: string;
  sections: readonly PolicySection[];
  title: string;
};

const effectiveDate = "2026년 9월 20일";

function PolicyPage({ description, sections, title }: PolicyPageProps) {
  return (
    <main className="page policy-page">
      <nav className="policy-nav" aria-label="정책 문서 이동">
        <Link to="/login">Tripic으로 돌아가기</Link>
        <div>
          <Link to="/privacy">개인정보 처리방침</Link>
          <Link to="/terms">서비스 이용약관</Link>
        </div>
      </nav>
      <article className="policy-card">
        <header>
          <p className="eyebrow">시행일 {effectiveDate}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items ? (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </main>
  );
}

const privacySections: readonly PolicySection[] = [
  {
    title: "1. 처리하는 정보와 목적",
    items: [
      "카카오 회원 식별값, Tripic 사용자 ID와 닉네임: 계정 생성과 로그인 유지",
      "여행 기록의 제목, 날짜, 메모와 해시태그: 기록 저장·조회·수정·삭제",
      "이용자가 선택한 사진의 EXIF가 제거된 압축 사본: 여행 기록 표시와 기기 간 동기화",
      "관광지 검색어와 사용자가 확정한 관광지·지역 코드: 관광지 검색과 여행 지도 표시",
      "HttpOnly 인증 쿠키와 접속 과정의 통신 정보: 안전한 세션 유지와 장애 대응",
    ],
  },
  {
    title: "2. 사진과 위치정보",
    paragraphs: [
      "Tripic 웹은 이용자가 직접 선택한 사진만 처리합니다. 방문 날짜 자동 입력을 위해 사진의 촬영일만 브라우저에서 일시적으로 확인하며, GPS 위치정보는 읽거나 저장하지 않습니다.",
      "업로드 전에 브라우저에서 사진을 새 JPEG로 변환해 EXIF와 GPS 메타데이터를 제거하고 1MB 이하로 압축합니다.",
      "현재 위치를 수집하지 않으며, 관광지는 이용자가 입력한 키워드로 검색합니다. 사진 원본은 Tripic 서버에 저장하지 않습니다.",
    ],
  },
  {
    title: "3. 외부 서비스와 처리위탁",
    items: [
      "카카오: 로그인과 계정 식별",
      "한국관광공사 TourAPI: 관광지 키워드 검색과 관광정보 제공",
      "Vercel: 웹 애플리케이션 호스팅과 전송",
    ],
    paragraphs: [
      "각 외부 서비스의 정보 처리에는 해당 사업자의 개인정보 처리방침이 적용될 수 있습니다. Tripic은 이용자의 개인정보를 판매하지 않습니다.",
    ],
  },
  {
    title: "4. 보유기간과 삭제",
    paragraphs: [
      "계정과 여행 기록은 서비스 이용 기간 동안 보관합니다. 이용자는 앱 안에서 개별 기록, 전체 기록 또는 계정을 삭제할 수 있습니다. 법령상 보관 의무가 없는 정보는 삭제 요청 또는 회원탈퇴 처리 후 지체 없이 파기합니다.",
    ],
  },
  {
    title: "5. 이용자의 권리와 안전성 확보",
    paragraphs: [
      "이용자는 자신의 정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다. Tripic은 HTTPS 통신, HttpOnly 인증 쿠키, 접근 통제와 사진 메타데이터 제거를 사용해 정보를 보호합니다.",
    ],
  },
  {
    title: "6. 문의",
    paragraphs: [
      "개인정보 또는 서비스 이용 문의는 support@remin.dev로 보내 주세요. 정책이 변경되면 이 페이지에 변경 내용과 시행일을 안내합니다.",
    ],
  },
];

const termsSections: readonly PolicySection[] = [
  {
    title: "제1조 목적과 서비스",
    paragraphs: [
      "이 약관은 Tripic이 제공하는 여행 기록, 사진 저장, 관광지 검색과 여행 지도 서비스의 이용 조건을 정합니다. 웹 서비스 이용에는 카카오 로그인이 필요합니다.",
    ],
  },
  {
    title: "제2조 이용자의 책임",
    items: [
      "본인이 이용할 권리가 있는 사진과 내용만 등록해야 합니다.",
      "타인의 권리 침해, 불법 정보 등록, 서비스 방해 또는 비정상적인 접근을 해서는 안 됩니다.",
      "계정 접근 수단을 안전하게 관리하고 도용이 의심되면 즉시 운영자에게 알려야 합니다.",
    ],
  },
  {
    title: "제3조 데이터와 외부 정보",
    paragraphs: [
      "여행 기록과 가공된 사진 사본은 기기 간 이용을 위해 Tripic 서버에 저장됩니다. 이용자는 중요한 원본 사진을 별도로 보관해야 합니다.",
      "관광정보는 한국관광공사 등 외부 제공자의 사정에 따라 변경되거나 실제 정보와 다를 수 있으므로 방문 전 공식 채널에서 확인해야 합니다.",
    ],
  },
  {
    title: "제4조 서비스 변경과 중단",
    paragraphs: [
      "점검, 장애, 외부 서비스 변경 또는 불가피한 운영상 사유로 서비스의 일부가 변경되거나 일시 중단될 수 있습니다. 중요한 변경은 가능한 범위에서 사전에 안내합니다.",
    ],
  },
  {
    title: "제5조 계정 해지와 데이터 삭제",
    paragraphs: [
      "이용자는 설정에서 회원탈퇴를 요청할 수 있습니다. 탈퇴 시 계정과 연결된 여행 기록 및 사진은 관련 법령에 따른 보관 의무가 없는 한 삭제됩니다.",
    ],
  },
  {
    title: "제6조 문의와 약관 변경",
    paragraphs: [
      "서비스 문의는 support@remin.dev로 보내 주세요. 약관을 변경하는 경우 적용일과 주요 내용을 서비스 또는 이 페이지에서 안내합니다.",
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <PolicyPage
      description="Tripic은 여행 기록 서비스를 제공하기 위해 필요한 최소한의 정보만 처리합니다."
      sections={privacySections}
      title="개인정보 처리방침"
    />
  );
}

export function TermsPage() {
  return (
    <PolicyPage
      description="Tripic 웹 서비스의 이용 조건과 이용자 및 운영자의 권리·의무를 안내합니다."
      sections={termsSections}
      title="서비스 이용약관"
    />
  );
}
