// Questions and messages to the user from the layers below the interface
// (io, features), which must not import it. The editor registers its styled
// dialogs at start-up; until then, and in the other apps, the browser's own
// are used. All return promises.

let impl = {
  alert: async msg => { window.alert(msg); return true; },
  confirm: async msg => window.confirm(msg),
  prompt: async (msg, value = '') => window.prompt(msg, value),
};
export const setNotifier = o => { impl = { ...impl, ...o }; };
export const alertUser = msg => impl.alert(msg);
export const confirmUser = msg => impl.confirm(msg);
export const promptUser = (msg, value = '') => impl.prompt(msg, value);
