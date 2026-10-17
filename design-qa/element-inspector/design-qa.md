# 엘리먼트 검사기 복사 필드 시각 검증 (1.2.0)

- source visual truth path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/baseline-fields-desktop.png`
- baseline implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/baseline-fields-desktop.png`
- desktop implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-desktop.png`
- tablet implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-tablet.png`
- mobile implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-mobile.png`
- baseline CSS viewport: 1920x1080
- desktop CSS viewport: 1920x1080
- tablet CSS viewport: 1024x768
- mobile CSS viewport: 390x844
- browser capture command: `CAPTURE_PHASE=baseline|implementation EXTENSION_DIR=$PWD/output/element-inspector QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector node tests/capture-settings.cjs`
- rendered test receipt: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/behavior/receipt.json`

## State / required fidelity surfaces

실제 MV3 options.html 및 popup.html. 인증 없는 격리 Chromium·합성 업무 fixture, light theme, DPR1, CtrlShiftY·모든 필드 선택 상태. baseline은 변경 전1.1.0 실제 설치본이며 implementation은 변경 후1.2.0 실제 설치본이다. 동일 확장 ID/route/단축키·viewport를 사용했다. 사용자 Chrome 기본 프로필과 OS toolbar popup 창 자체는 조작하지 않았다.

설정 desktop1920×1080/tablet1024×768/mobile390×844, 메뉴320×600. 비교는 동일 배율의3840×1080/2048×768/780×844/640×600이다. 설정 화면은 세로로 스크롤할 수 있으며 저장 버튼까지 모두 접근 가능하다. 각 label은36px 줄에서18×18px checkbox와 가운데 정렬된다. 저장/복원 버튼은 기존42px 규칙을 유지한다. 모든 viewport에서 가로 overflow 없음, 메뉴는600px 안에 들어간다. 실제 측정: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-receipt.json`.

## Findings / comparison history

아래 실제 비교본4개를 열어 확인했다. 기본 화면 문법·한글 타이포/대비·단축키/주행동을 유지하고 네이티브 체크박스11개를2열로 제공한다. label과 checkbox가 함께 클릭되며 DOM/Tab 순서는 화면 행 순서와 같다. 과도한 카드·장식·영문 배지 없음. design-anti-slop/web-composition 및 visual-ui-qa-loop 적용. 남은 P0/P1/P2 없음.

- comparison desktop: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/comparison-fields-desktop.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/baseline-fields-desktop.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-desktop.png`
- comparison tablet: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/comparison-fields-tablet.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/baseline-fields-tablet.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-tablet.png`
- comparison mobile: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/comparison-fields-mobile.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/baseline-fields-mobile.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-mobile.png`
- comparison popup: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/comparison-fields-popup.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/baseline-fields-popup.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/design-qa/element-inspector/implementation-fields-popup.png`

## Primary interaction / behavior

`EXTENSION_DIR=$PWD/output/element-inspector QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T052043Z-9a9c223ab617/behavior npm test` exit0. 기존30개 행동 그룹 및 새11필드 각각 단독복사·CSS만·URL+CSS·메뉴 즉시 저장·페이지/메뉴 reload 지속·이미 열린 iframe 전달·설정/메뉴 마지막 선택 보호·정보 부재 시 기존 clipboard 유지 검증 통과, pageerror0. disabled 항목의 줄이 유출되지 않는 실제 clipboard readback을 확인했다. 기본값 복원은 전체 선택이며 사용자가 각 필드를 직접 결정한다.

TDD 최초0!==11 실패 후 구현. 마지막 토글 자동복구를 Playwright uncheck 대신 click으로 검증하고, 검사 시작 시 닫히는 실제 popup을 이후 선택검증 때 다시 열었으며 iframe oracle은 fixture의 실제 /frame 경로로 교정했다. 이는 harness 수정이고 제품 회귀를 은폐하지 않았다. 브라우저·임시프로필·fixture서버는 finally에서 종료/정리했다.

선행1.0/1.1 판단·commit/원본 검증은 정본 배정 실행기록에 보존한다. 본 보고는 현재1.2 변경 화면과 실제 동작 증거다. 외장 run은 완료+24시간 등록하며 영구 결과는 정본 PRD와 Git 소스에 유지한다.

final result: passed
