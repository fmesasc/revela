// The editor's small helps, started once by the editor (apps/editor/main.js): the format painter as a mode
// (ui/canvas/painter.js), the «/» menu, automatic lists' undo and the hint on text that doesn't fit
// (textaids.js), live previews on hover (ui/ribbon/livepreview.js), the save state and the empty slide's hint
// (savestate.js).
import { initPainter } from '../canvas/painter.js';
import { initTextAids } from './textaids.js';
import { wireLivePreviews } from '../ribbon/livepreview.js';
import { wireEffectDemos, wireMorphDemos } from './fxdemo.js';
import { initSaveState } from './savestate.js';

export function initEditAids() { initPainter(); initTextAids(); wireLivePreviews(); wireEffectDemos(); wireMorphDemos(); initSaveState(); }
