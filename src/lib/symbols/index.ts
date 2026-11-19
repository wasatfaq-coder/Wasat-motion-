// Symbol library (MASTER_PROMPT_FINAL §24.1): one entry per row of src/lib/symbols/catalog.json.
// A symbol shows the CAUSE of a state: it appears on the event and leaves when the cause is removed.
export {storm} from './storm';
export {tangle} from './tangle';
export {bloom, bloomStates} from './bloom';
export {sparks} from './sparks';
export {trapdoor, trapdoorStates} from './trapdoor';
export {levitate, sink} from './gravity';
import CATALOG from './catalog.json';
export {CATALOG};
export type SymbolId = keyof typeof CATALOG.symbols;
