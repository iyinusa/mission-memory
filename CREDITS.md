# Credits & References

Every external resource used in Mission Memory, kept current through the hackathon and copied into the
NASA Space Apps **References** field. Mission Memory is not an official NASA product and uses no NASA logos,
insignia or mission patches.

## NASA data and resources

| Resource | Used for | Link |
|---|---|---|
| NASA Space Science Data Coordinated Archive (NSSDCA) | Identity, landing coordinates, timelines and final status of every explorer | https://nssdc.gsfc.nasa.gov/ |
| NASA Science mission pages | Discoveries and story facts | https://science.nasa.gov/ |

_NSSDCA record IDs and per-fact sources are listed on each explorer in `web/public/data/artifacts.json` and shown in the app._

<!-- Add imagery, textures and 3D models here as they are added (NASA Image Library PIA IDs, SVS, USGS, LROC, HiRISE, NASA 3D Resources). -->

## Software

| Package | License |
|---|---|
| React, React DOM | MIT |
| React Router | MIT |
| three.js | MIT |
| @react-three/fiber, @react-three/drei | MIT |
| Vite, vite-plugin-singlefile | MIT |
| MCP TypeScript SDK (`@modelcontextprotocol/server`, `client`, `node`, `express`) | Apache-2.0 |
| MCP Apps SDK (`@modelcontextprotocol/ext-apps`) | MIT / Apache-2.0 (licensing transition, see package LICENSE) |
| Express, cors | MIT |
| Zod | MIT |
| nginx | BSD-2-Clause |

## Fonts

| Font | License |
|---|---|
| Atkinson Hyperlegible (Braille Institute), via Fontsource | SIL OFL 1.1 |
| Space Grotesk, via Fontsource | SIL OFL 1.1 |

## Super Intelligence (SI) tools

| Tool | How it was used | Where it is disclosed |
|---|---|---|
| Claude Code (Anthropic) | Research, planning support, code, and first drafts of story text written only from cited NASA facts. Every story is fact-checked by the team. | This file, the README, and a label on each story in the app |
| Kokoro-82M TTS (hexgrad, Apache-2.0), voice `bm_fable` | Synthetic narration audio | A label on the audio player, and the MP3 metadata (ID3 tags) |

No SI-generated images or video are used.
