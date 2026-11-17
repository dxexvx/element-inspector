# PAT 연결 테스트와 단일 저장 · 1.3.2

- source visual truth path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/baseline-connection-overview-desktop.png`
- baseline implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/baseline-connection-overview-desktop.png`
- desktop implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/implementation-connection-overview-desktop.png`
- tablet implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/implementation-connection-overview-tablet.png`
- mobile implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/implementation-connection-overview-mobile.png`
- baseline CSS viewport: 1920x1800
- desktop CSS viewport: 1920x1800
- tablet CSS viewport: 1024x1800
- mobile CSS viewport: 390x1800
- browser capture command: `QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79 CAPTURE_PHASE=baseline node tests/capture-connection.cjs`; 같은 명령의 CAPTURE_PHASE=implementation으로 변경 후 촬영
- rendered test receipt: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/connection-receipt.json`

## State / required fidelity surfaces

실제 options.html, 합성 PAT·프로젝트DEV, 모든 복사 필드 선택, 캡처off, Picklog origin만 허용, light theme, DPR1의 동일 격리 Chrome이다.1.3.1과1.3.2에서 입력 후 고급 설정의 연결 버튼을 클릭했다. baseline은 연결과 동시에 저장·입력 지우기, implementation은 테스트만 수행·입력 유지·저장 필요 표시가 의도한 차이다. 실제 사용자 PAT가 아니다. 개요 PNG는 실제 CSS viewport1920×1800/1024×1800/390×1800에서 fullPage 없이 촬영했다. 일반 높이 fullPage 원본은 별도 보관하며 CSS 높이와 혼동하지 않는다.

## Comparison history / findings

세 쌍을 열어 검토했다. 연결 테스트가 별도44px 버튼이고 저장은 하단 한 개다. 테스트 후 미저장 안내가 보이며 기존 폼과 버튼의 가로 넘침·겹침·잘림은 없다.390px에서 추가 설명과 상태가 자연스럽게 줄바꿈한다. 저장된 연결의 해제 버튼은 기존 동작을 유지한다. 남은P0/P1/P2 없음.

- comparison desktop: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/comparison-connection-overview-desktop.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/baseline-connection-overview-desktop.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/implementation-connection-overview-desktop.png`

- comparison tablet: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/comparison-connection-overview-tablet.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/baseline-connection-overview-tablet.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/implementation-connection-overview-tablet.png`

- comparison mobile: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/comparison-connection-overview-mobile.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/baseline-connection-overview-mobile.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79/design-qa/picklog-connection/implementation-connection-overview-mobile.png`

## Primary interaction / verification

`QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T065858Z-f606f0637a79 npm run test:connection`은 실제UI·worker·IndexedDB와 network-only fixture를 사용한다.12개 검증 기준: 단일 저장, 테스트 후 새PAT 미저장, 저장 없이 재열기, 통신 없이 저장, 기본설정/PAT 동시 적용, 브라우저 재시작, 실패 시 입력/기존값 보존, 다른 프로젝트 테스트의 저장값 불변, 빈PAT의 기존 토큰 유지, 입력 수정 시 확인상태 해제, legacy 이전, 연결해제 영구 반영을 통과했다. 예상된401/프로젝트 거부/오프라인 응답은 fixture이며 pageerror0이다. 콘텐츠에서 새 테스트/저장 메시지 접근도 거부된다.

단위4묶음·캡처15묶음(단일 업로드·원본 픽셀/바이트·실제 클립보드 참조)·기존 복사30묶음/11필드가 통과했다. 모든 owned browser/profile/server가 종료·삭제됐다. native 권한 대화상자 자체를 자동 검증했다고 주장하지 않는다. 이번 변경의 네트워크 검증은 합성 API다. 실제 Picklog 등록은 사용자가 확인했다고 보고했고 업로드 API 계약은 변경하지 않았다. 앞선1.3.1의 실제 서비스 검증을 이번 새 실행으로 표시하지 않는다.

final result: passed
