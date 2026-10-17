# 엘리먼트 검사기 시각 검증

- source visual truth path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/baseline-desktop.png`
- baseline implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/baseline-desktop.png`
- desktop implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/implementation-desktop.png`
- tablet implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/implementation-tablet.png`
- mobile implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/implementation-mobile.png`
- baseline CSS viewport: 1920x1080
- desktop CSS viewport: 1920x1080
- tablet CSS viewport: 1024x768
- mobile CSS viewport: 390x844
- browser capture command: `EXTENSION_DIR=$PWD/output/element-inspector QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector npm test`
- rendered test receipt: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/receipt.json`

## State / required fidelity surfaces

HTTP localhost fixture, 인증 없음, 합성 데이터: 특수문자 ID 버튼·반복 class2개·식별자 없는 문단·입력란·열린 Shadow DOM·HTTP iframe·긴 class. light theme, device scale1, desktop/tablet 저장 버튼 hover·mobile 화면 끝 요소 hover. 새 기능이라 baseline은 같은 runtime·route·viewport·pointer에서 검사 비활성 상태다. 본체·설정·popup은 실제 확장 코드다.

설정1920×1080/390×844 및 popup1024×768 실제 렌더를 열어 확인했다. 설정은 같은 등급 버튼42px, 한글 도움말 줄바꿈, 키보드 focus와 저장 상태를 유지했다. 캡처는 desktop1920×1080·tablet1024×768·mobile390×844, 비교본은 각각3840×1080·2048×768·780×844로 양쪽 동일 CSS 배율이다.

## Findings / comparison history

P2: 프레임에도 검사 상태를 전파하면서 포인터가 없는 프레임에 별도 안내가 남았다. 초기 tooltip을 숨기고 비활성 상태에서도 pointerout 기록을 초기화했다. 재활성화 시 프레임 tooltip 부재를 실제 회귀 assertion으로 확인했다.

비교본 `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/comparison-desktop.png`, `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/comparison-tablet.png`, `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T041650Z-f05fe77e7a66/design-qa/element-inspector/comparison-mobile.png`을 열어 동일 조건 비교했다. 강조는 대상 geometry와1px 이내 일치하고 모바일 긴 class는 줄바꿈되며 tooltip은 viewport 안에 있다. 페이지 레이아웃을 바꾸지 않는다. 남은 P0/P1/P2 없음. 아주 작은 iframe은 자체 viewport 안에서 정보창이 표시되므로 긴 내용은 잘릴 수 있다. 이는 iframe 경계 제한이며 요소 클릭/식별자 복사는 검증했다.

24개 행동 검증 그룹 통과, pageerror0. popup은 실제 HTML을 연 뒤 검사 탭을 활성 상태로 유지하여 DOM 버튼 handler를 실행했다. OS toolbar popup 창의 시각 캡처·사용자 Chrome 기본 프로필 설치는 수행하지 않았다. Chromium 격리 프로필에 실제 배포용 폴더를 설치하고 실제 클립보드를 readback했다. 테스트 종료 후 임시 프로필·서버·브라우저를 정리했다.

증거는 외장 run에서 완료+24시간 보관 대상으로 등록하며, 영구 판단은 배정 실행기록과 이 보고서에 남긴다.

## 1.1.0 후속 맥락 복사

페이지/문서/영역/요소 맥락을 복사 페이로드에 추가했다. hover 강조·정보창·성공/실패 toast의 표시 형식은 변경하지 않아 위 시각 비교의 동일 입력 범위는 유지된다. 새 배포용 폴더를 실제 로드한 30개 행동검증 그룹이 통과했고 pageerror0이다. 새 receipt: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261017T050717Z-ca20943ad09f/design-qa/element-inspector/receipt.json`. URL 민감 query/hash 제거·영역 heading/label·행/아이콘 이름·입력값 제외·긴 텍스트241자(말줄임 포함)·기존 CSS 해석을 확인했다. 프레임 간 늦은 상태 응답이 최신 조작을 덮지 않도록 requestId를 추가했다. 신규 화면 변경이 없어 별도 시각 재설계 loop는 적용하지 않았다.

final result: passed
