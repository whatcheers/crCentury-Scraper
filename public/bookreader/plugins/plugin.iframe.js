"use strict";(self.webpackChunk_internetarchive_bookreader=self.webpackChunk_internetarchive_bookreader||[]).push([[240],{7121:function(e,a,t){var n,r="bookReaderFragmentChange";BookReader.prototype.init=(n=BookReader.prototype.init,function(){n.call(this),function(e){var a=arguments.length>1&&void 0!==arguments[1]?arguments[1]:window.parent;a&&(e.bind(BookReader.eventNames.fragmentChange,(function(){var t=e.fragmentFromParams(e.paramsFromCurrent());a.postMessage({type:r,fragment:t},"*")})),window.addEventListener("message",(function(a){a.data&&a.data.type===r&&e.updateFromParams(e.paramsFromFragment(a.data.fragment))})))}(this)})}},function(e){e(e.s=7121)}]);
//# sourceMappingURL=plugin.iframe.js.map