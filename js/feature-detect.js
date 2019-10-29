function usesFragmention(href) {
    return (href && href.split('#').length > 1 && href.indexOf('%20') > 0);
}
(function(){
    if(usesFragmention(window.location.href)) {
        const fragScript = document.createElement('script');
        fragScript.setAttribute("type","text/javascript");
        fragScript.setAttribute("src", '/js/features/fragmention.js');
        document.body.appendChild(fragScript);
    }
})();