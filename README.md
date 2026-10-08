# AcrossB Label Helper

Configurable public source edition based on **v0.1.14**. An independent Chrome/Edge extension, not an official AcrossB or Google product. The original working installation is not modified by this repository.

Copies selected AcrossB JOB_READY batches to a Google Sheets label using browser keyboard input. No AI service, API key, external server, or analytics is used. UI language: Korean, English, Spanish.

## Install

1. Install Node.js 18 or later and download this repository (Code → Download ZIP) or clone it.
2. Open a terminal in the extracted folder, including VS Code's terminal.
3. Run npm run configure (no dependency installation needed).
4. Enter your own HTTPS AcrossB URL and the full Google Sheets edit URL including its gid.
5. Open chrome://extensions or edge://extensions, enable Developer mode, choose **Load unpacked**, and select the generated **dist** folder.
6. Refresh AcrossB and open the configured Google Sheet in the same browser profile. Your Google account must have edit access.

Do not load src directly: it contains placeholders. Re-run configuration and reload the extension to change targets. No company URL or live Sheet ID ships with the public source. Configuration is written locally to dist/settings.js; dist is excluded from Git. Do not upload or share your configured dist folder publicly.

## Label layout

| Cell/range | Input |
| --- | --- |
| B2:C2 | First selected batch date, MM/DD/YYYY |
| B4:C4 | Batch suffixes joined with + |
| A4 | DHL or TIKTOK (based on first batch carrier) |
| A8:C8 | 1 - total orders |
| A12 | Total orders |
| A6:C6 | First batch SKU lines and per-order quantities |

Use a compatible label template. These six inputs are overwritten, including any formula in the date input. Existing QR formulas, box rules, dimensions and print settings are not managed by this extension. Your own spreadsheet automation must already exist; private templates and Apps Script code are not included.

## Use

On JOB_READY, select batches, optionally Preview, then Fill label. The helper inputs the fields and clicks the toolbar's work instruction button. It does not confirm printing or shipment. Korean and English AcrossB labels are supported. Set your shortcut in the browser's extension shortcut settings; a suggested shortcut may not be registered automatically. A programmable mouse can send the registered shortcut.

Multiple batches: counts are summed in displayed DOM order; date, SKU composition and channel come from the first selected row. There are no checks for matching SKU composition, date, carrier or a 100-order limit. Select compatible batches yourself. Only rendered selected rows can be read. A green result indicates that input actions finished, not that saved values or QR output were verified. No undo/restore snapshot is provided.

## Permissions and limitations

- scripting: read displayed batch information and interact with the configured sheet.
- debugger: send browser keyboard/mouse input to the sheet. DevTools or browser policy can block this connection.
- storage: remember language and recent status locally/in the browser session.
- Host permissions: generated for your selected AcrossB origin and Google Sheets document. Browser host grants may apply at origin scope; runtime code additionally restricts the document and gid.

Do not use the mouse/keyboard in the sheet while input is running. Avoid concurrent writers to the same label. The code depends on AcrossB/Sheets UI structure and can break if those pages change. This public configurable edition has not been tested against a live warehouse or sheet. Confirm the label before printing. SKU typing delays from v0.1.14 are retained; short fields use reduced delays.

## Public files

src/ contains extension code and UI only. configure.cjs creates the local install. package.json contains the setup command. No production data, credentials, screenshots, private templates, old release ZIPs or local configuration belong in this repository.

## 한국어

v0.1.14 기반 공개용 사본입니다. npm run configure 실행 후 본인의 AcrossB 주소와 gid가 포함된 구글 시트 링크를 입력하세요. 생성된 dist 폴더를 확장 프로그램으로 로드합니다. dist에는 개인 설정이 있으므로 공개 업로드하지 마세요. 날짜는 첫 배치 날짜이며, 여러 배치 합산 시 SKU도 첫 배치 기준입니다.

## Español

Versión pública configurable basada en v0.1.14. Ejecuta npm run configure, introduce tus enlaces y carga dist como extensión sin empaquetar. No publiques dist: contiene tu configuración. Usa una hoja compatible y revisa la etiqueta antes de imprimir.
