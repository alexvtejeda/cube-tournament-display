// Audience window: renders the operator's latest snapshot and holds no state of its own.
import { createSubscriber } from '../core/channel.js';
import { createAudienceView } from './audience-debug-view.js';

const view = createAudienceView(document.getElementById('audience'));
createSubscriber((snapshot) => view.render(snapshot));
