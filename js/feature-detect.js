const FRAGMENTION_SRC = '/js/features/fragmention.js';
function usesFragmention(href) {
    return (href && href.split('##').length > 1 && href.indexOf('%20') > 0);
}
function includeFragmentionScript(elem) {
    if(elem.querySelector(`script[src="${FRAGMENTION_SRC}"]`)) return;
    const fragScript = document.createElement('script');
        fragScript.setAttribute("type","text/javascript");
        fragScript.setAttribute("src", FRAGMENTION_SRC);
    elem.appendChild(fragScript);
}
(function(){
    if(usesFragmention(window.location.href)) {
        includeFragmentionScript(document.body);
    }
    const button = document.querySelector('.toggle-fragmention, .toggle-fragmention > a');
    if (button) {
        button.classList.remove('hidden');
        button.addEventListener('click', function() { includeFragmentionScript(document.body); })
    }
})();

(function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(
            '/serviceworker.js',
            {
                scope: '/'
            }
        ).then(function(reg) {
            if(reg.installing) { // installing
            } else if(reg.waiting) { // installed
            } else if(reg.active) { // active
            }
            reg.update();
        }).catch(function(error) { // registration failed
            console.error('Registration failed with ' + error);
        });
    }
})();