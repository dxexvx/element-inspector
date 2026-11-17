# Picklog 연결 확인과 PAT 영구 보관 · 1.3.1

- source visual truth path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/baseline-connection-overview-desktop.png`
- baseline implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/baseline-connection-overview-desktop.png`
- desktop implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/implementation-connection-overview-desktop.png`
- tablet implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/implementation-connection-overview-tablet.png`
- mobile implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/implementation-connection-overview-mobile.png`
- baseline CSS viewport: 1920x1800
- desktop CSS viewport: 1920x1800
- tablet CSS viewport: 1024x1800
- mobile CSS viewport: 390x1800
- browser capture command: `CAPTURE_PHASE=baseline EXTENSION_DIR=/Users/devis/Yeo/Workspaces/Ychis/Code/devs/chrome-extensions/element-inspector/output/element-inspector QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d node tests/capture-connection.cjs`; implementation `CAPTURE_PHASE=implementation QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d node tests/capture-connection.cjs`
- rendered test receipt: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/connection-receipt.json`

## State / required fidelity surfaces

동일 options.html, light theme, 합성 PAT·프로젝트DEV, 캡처off와 Picklog origin만 허용한 격리 Chrome. baseline1.3.0과 implementation1.3.1에서 동일하게 연결을 누른 뒤 비교했다. 기존 버전의 권한 거부와 수정 버전의 실제 인증·프로젝트 확인은 의도한 행동 차이다. PAT를 표시하지 않으며 입력은 비워진 상태다. 개요 비교는 실제 CSS viewport1920×1800/1024×1800/390×1800, DPR1에서 fullPage 옵션 없이 촬영했다. 긴 설정 전체를 같은 높이에서 비교하려고1800px를 사용했다. 일반1920×1080/1024×768/390×844의 실제 fullPage 원본과 가로 넘침 검사는 별도로 보존한다. fullPage PNG를 CSS viewport 높이와 같다고 기록하지 않는다. 비교는 리사이즈하지 않았으며 생성 후 같은 바이트를 본 feature 아래로 옮겼다.

## Comparison history / findings

세 쌍을 직접 열어 검토했다. 인증 결과·프로젝트·확인 시각은 고급 설정 밖 한 곳에 표시한다. 중복 상태 문구를 제거했다. 저장된 PAT는 값 대신 유지 안내만 제공하고 저장·연결 확인/해제는44px 버튼이다. 좁은 화면은 상태를 자연스럽게 줄바꿈하며 가로 넘침이 없다. 기존 필드·단축키·캡처·저장 동선을 보존했다. 실패는 원인을 표시하고 기존 입력/저장값을 유지한다. 남은P0/P1/P2없음.

- comparison desktop: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/comparison-connection-overview-desktop.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/baseline-connection-overview-desktop.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/implementation-connection-overview-desktop.png`
- comparison tablet: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/comparison-connection-overview-tablet.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/baseline-connection-overview-tablet.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/implementation-connection-overview-tablet.png`
- comparison mobile: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/comparison-connection-overview-mobile.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/baseline-connection-overview-mobile.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/design-qa/picklog-connection/implementation-connection-overview-mobile.png`

## Primary interaction / verification

`npm run test:connection`은 실제 worker·IndexedDB·UI와 network-only fixture를 사용한다. 캡처off에서 연결, 실제 확인 API 경로, 접힌 상태 표시, 완전한 브라우저 재시작 후 PAT 재사용, 실패 입력 보존, 잘못된 프로젝트 거부, 더 최신 영구값 보호, surviving legacy 이전, 해제 후 재시작 시 삭제를 통과했다. service worker가 복원될 때 context.route가 붙지 않는 경계 때문에 해당 network fixture를 worker에 명시했으며 실제 서비스 성공으로 부르지 않는다.

독립 `python3 tools/verify-picklog.py /Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d`는 기존 OpenBao PAT를 사용해 실제 인증·프로젝트 확인→영구 저장→브라우저 종료/재시작→재인증→캡처 업로드·원본 hash·clipboard 참조 확인을 통과했다. cap_01m7m2vnyn36h5nvxvgj938b5y,330ms 단일 표본, DELETE/목록 readback 정리true다. 실제 PAT 프로필은 증거 폴더 밖 OS 임시 경로에서 생성·삭제하고 비밀값을 출력하지 않았다. 실제 재시작 화면: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T061552Z-403ce50bf75d/connection-live-restarted.png`.

기존 캡처15묶음·content DB 비노출·복사30묶음/11필드와 단위4묶음도 통과했다. 권한 native 대화상자 전체 및 별도 lazy worker reload 이벤트를 자동검증했다고 주장하지 않는다. 전체 브라우저 재시작이 메모리 소실 후 영구 데이터 사용을 직접 증명한다. owned contexts/profiles/servers는 정리했다.

final result: passed
