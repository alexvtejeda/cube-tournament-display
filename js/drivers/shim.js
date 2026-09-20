// Supplies what vendor/stackmat.js expects from csTimer's kernel, so the decoder stays
// byte-for-byte unmodified (vendor/PROVENANCE.md). A classic script: load it before the decoder.
window.DEBUG = false;
window.execMain = function (main, args) {
  return main.apply(null, args || []);
};
window.$ = {
  now: function () {
    return Date.now();
  },
  noop: function () {},
};
window.kernel = {
  // stkHead: trust the packet's header byte (hands, green light). Without it every header is 'S'.
  getProp: function (key) {
    return key === 'stkHead';
  },
};
