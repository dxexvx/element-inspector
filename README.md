# 엘리먼트 검사기


포인터로 웹페이지 요소를 강조하고 id·class를 확인한 뒤, 클릭하여 페이지·영역 맥락과 CSS 식별자를 함께 복사하는 Chrome Manifest V3 확장입니다. 복사한 식별자를 에이전트에게 붙여 수정 위치를 전달할 수 있습니다.

이 저장소는 **element-inspector 전용**입니다. `chrome-browser`는 로컬 상위 폴더이며 Git 저장소가 아닙니다. [도메인 계정 로그인](https://github.com/dxexvx/domain-account-login)은 별도 저장소입니다.

## 설치

1. [소스 ZIP](https://github.com/dxexvx/element-inspector/archive/refs/heads/main.zip)을 받아 압축을 풉니다. Git 사용자는 아래 명령을 사용합니다.
2. 폴더를 오래 유지할 위치에 둡니다. 예: `문서/chrome-browser/element-inspector`.
3. Chrome의 `chrome://extensions` → **개발자 모드** → **압축해제된 확장 프로그램을 로드합니다**에서 **이 저장소 루트**를 선택합니다. 바로 안에 `manifest.json`이 있어야 합니다.
4. 목록에서 **엘리먼트 검사기**와 버전을 확인하고 일반 웹페이지를 새로고침합니다. 설치에 Node.js·빌드·Web Store 계정은 필요하지 않습니다.

```sh
mkdir -p "$HOME/chrome-browser"
git clone https://github.com/dxexvx/element-inspector.git "$HOME/chrome-browser/element-inspector"
```

에이전트에게는 다음 요청을 전달하세요.

> https://github.com/dxexvx/element-inspector 의 README와 INSTALL.md를 읽고 엘리먼트 검사기를 설치해줘. 기존 설치 경로와 설정은 보존하고, 새 설치는 chrome-browser/element-inspector 저장소 루트의 manifest.json을 확인해 Chrome에서 로드해줘. 실제 목록 이름·버전과 일반 웹페이지의 강조·복사·취소를 확인해줘.

[에이전트 설치·업데이트 안내](INSTALL.md) · [간단 사용 매뉴얼](MANUAL.md)

## 사용

- 기본 **Alt + Shift + E**로 검사를 켜거나 끕니다. macOS의 Alt는 Option입니다. 확장 메뉴의 **검사 켜기·끄기**도 사용할 수 있습니다.
- 포인터 아래 요소를 강조하고 태그·id·class와 복사할 식별자를 보여줍니다.
- 클릭하면 원래 페이지의 링크/버튼 동작을 막고 페이지 URL·문서 제목·가까운 영역 제목·요소/행 텍스트·태그·id·class·CSS 식별자를 클립보드에 함께 복사합니다. 복사 후 검사가 끝나며 다음 클릭은 원래대로 작동합니다. **Esc**는 복사 없이 종료합니다.
- 확장 메뉴 **단축키 설정**에서 입력 칸을 선택하고 조합키를 누른 뒤 **저장**합니다. Ctrl·Command·Alt 중 하나와 영문/숫자가 필요하고 Shift를 추가할 수 있습니다. 기존 탭에도 즉시 적용되며 브라우저를 다시 열어도 저장됩니다.
- ID를 우선 사용하고 중복 ID/class 또는 식별자 없는 요소는 유일한 CSS 경로를 만듭니다. 특수문자는 CSS 방식으로 이스케이프합니다.
- 열린 Shadow DOM은 `#host >>> #inside`처럼 경계를 표시합니다. `>>>`는 전달용 표기이며 하나의 `querySelector`에 넣는 표준 CSS가 아닙니다. 각 경계에서 `shadowRoot`로 들어가세요.
- HTTP(S) iframe에서도 강조·복사가 작동하며 프레임 주소를 함께 표시합니다. 영역 제목은 가까운 heading·영역 이름을 우선 사용하며 찾지 못하면 `(제목 없음)`으로 표시합니다. 표시된 텍스트는 최대240자(영역 제목120자, 문서 제목200자)로 제한하며 입력·선택·편집칸의 값은 렌더링된 텍스트 추출에서 제외합니다. 알려진 인증 관련 URL 인자도 제외하지만, 화면 내용·URL 경로·요소 식별자에 민감정보가 남을 수 있어 붙여넣기 전에 확인하세요.

## 범위

Chrome 내부 페이지·웹 스토어·PDF 뷰어 등 Chrome이 확장 실행을 막는 화면, file:// 페이지, 닫힌 Shadow DOM은 대상 밖입니다. 브라우저/운영체제 예약 단축키는 사용할 수 없으며 다른 확장/페이지와 충돌하면 설정에서 조합키를 바꾸세요. 페이지의 입력/편집 영역에서는 비활성 검사기의 단축키를 가로채지 않습니다.

검사기는 사용자 클릭 시에만 식별자를 복사합니다. 텍스트 복사문은 서버로 보내지 않으며, 사용자가 캡처와 Picklog 연결을 켠 경우 선택한 이미지만 Picklog로 보냅니다. `storage`는 단축키·탭 검사 상태 저장, `clipboardWrite`는 선택한 정보와 미리보기의 이미지를 복사하는 데 사용합니다. HTTP(S) content script는 모든 사이트에서 조합키를 받기 위한 것이며 사이트 접근 권한 안내가 표시됩니다.

## 개발·검증

Node.js와 Python 3을 사용합니다. 런타임은 외부 라이브러리 없이 실행됩니다.

```sh
npm ci --ignore-scripts
npx playwright install chromium  # 브라우저가 없는 개발 환경에서만
npm run check
QA_DIR=/verified/external/artifact/run/design-qa/element-inspector npm test
npm run package
```

`QA_DIR`은 실행 증거의 명시적인 보관 경로입니다. 테스트는 임시 Chromium 프로필에 실제 확장을 설치하고 설정 저장·단축키·강조 geometry·실제 clipboard readback·클릭 차단과 복귀·iframe·Shadow DOM·실패 안내·반응형을 검사합니다. 사용자 Chrome 프로필은 변경하지 않습니다. 테스트 fixture와 Chromium의 실제 클립보드에 검증용 식별자가 복사됩니다.

공식 근거: [Chrome commands API](https://developer.chrome.com/docs/extensions/reference/api/commands), [Playwright의 실제 확장 로드](https://playwright.dev/docs/chrome-extensions). Chrome commands에는 조합키를 프로그램으로 수정하는 API가 없어 설정 화면의 페이지 키 이벤트 조합을 사용합니다.

## 업데이트

기존 설치 폴더의 경로를 유지하세요. `chrome://extensions`에서 **엘리먼트 검사기 새로고침**을 누른 뒤 검사할 웹페이지도 새로고침하세요. 설정한 단축키는 유지됩니다.

복사 예시:

```text
페이지 URL: https://example.com/ideas?group=54157
문서 제목: 아이디어 · 데비스라이프
영역 제목: 크롬확장프로그램
요소 텍스트: 엘리먼트검사기
요소: div
id: (없음)
class: todo-item
CSS: div#group-54157 > ul > li > div.todo-item
```

기존 CSS 문자열만 받던 도구는 복사문의 `CSS: ` 줄에서 식별자를 읽으면 됩니다. 위 주소와 문구는 출력 형식을 보여주는 예시입니다.

## 복사할 정보 선택 (1.2.0)

확장 아이콘 메뉴의 ‘복사할 정보’에서 각 필드를 체크하거나 해제합니다. 선택 즉시 열린 페이지의 다음 복사에 반영되며, 다시 열어도 유지됩니다. 설정 화면에서는 단축키와 함께 선택 후 저장합니다. 처음에는 기존과 같이 모든 필드가 선택되어 있습니다. CSS만 필요하면 CSS만 남겨두세요. CSS 자체도 해제할 수 있습니다. 최소1개를 선택해야 합니다.

페이지 URL·문서 제목·영역 제목·요소 텍스트·항목 텍스트·요소 이름·요소 태그·id·class·CSS·프레임 주소를 각각 선택합니다. 항목/요소 이름과 프레임 주소는 해당 정보가 있을 때 복사합니다. 선택한 정보가 없는 요소에서는 안내를 표시하고 기존 클립보드를 유지합니다. ‘기본값 복원’은 단축키와 전체 필드 선택을 복원하며 저장해야 적용됩니다.

업데이트: 기존 설치 경로를 유지한 채 chrome://extensions의 확장 새로고침 후 대상 웹페이지도 새로고침하세요.


## 요소 이미지와 Picklog 연결 (1.3.0)

설정에서 **요소를 클릭할 때 이미지도 캡처**를 켜고 Chrome의 선택 권한을 허용한 뒤 저장합니다. 단축키로 검사하고 요소를 클릭하면 기존 정보가 먼저 복사됩니다. 보이는 요소를 PNG로 캡처하고 결과의 **이미지 보기·복사**에서 확인합니다. 미리보기의 **이미지·정보 복사**를 누르면 이미지를 지원하는 곳에는 이미지로, 텍스트 편집기에는 요소 정보로 붙여넣습니다. 기존 요소 정보는 처음 클릭할 때 바로 복사되며 파일을 다운로드하지 않습니다.

**고급 설정 · Picklog 연결**에 기존 PAT와 저장 프로젝트 키(예: DEV)를 입력하고 **PAT 저장·연결 확인**을 누릅니다. PAT에는 캔버스 읽기·쓰기와 해당 프로젝트 접근 권한이 필요합니다. 이후 캡처는 고정 `https://picklog.devislife.com`의 캔버스에 올라갑니다. 저장된 원본 이미지 바이트를 확인한 뒤 복사문에 다음 두 줄을 추가합니다.

```text
Picklog 캔버스 ID: cap_실제서버발급ID
Picklog 캔버스: https://picklog.devislife.com/captures/cap_실제서버발급ID
```

PAT는 이 브라우저 프로필의 **확장 전용 IndexedDB에 영구 보관**합니다. 브라우저 재시작·확장 새로고침 후에도 유지하며 연결 해제나 확장 제거 시 삭제합니다. 웹페이지/content script의 저장소와 origin이 다르며 PAT를 화면·복사문·일반 설정·기기간 동기화에 노출하지 않습니다. 저장된 PAT는 다시 보여주지 않으며 입력칸을 비우면 기존 값을 사용합니다. 별도 암호화 보관함은 제공하지 않으므로 브라우저 프로필을 사용할 수 있는 사람이 있는 환경에서는 해당 프로필의 접근을 관리해야 합니다.

캡처를 끈 상태에서도 Picklog 사이트 접근 권한만 허용하면 연결할 수 있습니다. 설정을 열거나 **PAT 저장·연결 확인**을 누를 때 실제 캔버스 API와 접근 가능한 프로젝트 목록을 조회합니다. 고급 설정을 닫아도 **인증·프로젝트 확인 결과와 확인 시각**이 보입니다. 프로젝트 목록 읽기 권한이 없으면 PAT 인증만 확인됐음을 표시하며, 캔버스 쓰기 권한은 실제 업로드 때 확인합니다. 실패하면 입력과 기존 저장된 연결을 보존하고 PAT 인증·프로젝트 키·사이트 권한·통신 오류를 구분합니다. 일반 **저장**도 입력한 PAT와 프로젝트 연결을 함께 처리합니다.

캡처는 **현재 화면에 보이는 부분**만 포함하며 화면 밖까지 스크롤하거나 iframe 내부를 합성하지 않습니다. 열린 Shadow DOM은 지원합니다. 화면에 표시된 입력값·개인정보도 이미지에 그대로 포함되므로 캡처 전에 내용을 확인하세요. 텍스트 복사의 입력값 제외 규칙이 이미지 마스킹을 의미하지는 않습니다. 브라우저 확대는 실제 스크린샷 배율을 사용하며 핀치 확대는 지원하지 않습니다.

캡처·인증·프로젝트 권한·업로드 확인이 실패하면 기존 요소 정보는 그대로 복사됩니다. 전송 결과가 불명확하면 자동 재업로드하지 않으므로 먼저 캔버스를 확인하세요. 업로드가 끝나기 전에 다른 탭을 선택했거나 클립보드 갱신이 거부되면 원래 페이지의 **참조 포함 다시 복사**를 누릅니다. 이미지 미리보기 결과는 최대2분·최근3개 탭까지 메모리에 보관합니다. POST/원본 조회는 각각15초 제한이며 한 번의 클릭에서 업로드를 한 번만 시도합니다.

추가 검증: `npm run test:unit`, `QA_DIR=/verified/external/run npm run test:capture`. 전자는 좌표·고정 origin·원본 대조·실패를 검사하고 후자는 실제MV3와 합성 Picklog 응답을 구분해 검사합니다. `tools/verify-picklog.py`의 실제 연동 검사는 기존 OpenBao 머신 소비자가 있는 승인된 개발 환경에서만 수행합니다.

기술 근거: [화면 캡처 권한](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab), [메모리 세션 저장](https://developer.chrome.com/docs/extensions/reference/api/storage#property-session).

1.3.1은 연결 검사를 캡처용 모든 사이트 권한에서 분리하고 PAT 영구 저장·재시작 후 재확인·상태 표시를 추가합니다. 추가 검증은 `QA_DIR=/verified/external/run npm run test:connection`을 사용합니다. 저장소 경계는 [Chrome 공식 문서](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)를 따릅니다.
