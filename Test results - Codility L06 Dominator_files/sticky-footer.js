/*
	Combo footer: use common folklore of CSS hacks, but set the height via JS instead of hardcoding it. This way you only need the assumptionthat the footer height remains constant (document height can vary however it wants).
	Run just after footer is parsed; we should already have pre_footer and #push_footer in DOM by that time.
*/
(function() {
	var height = $('#footer').height() + 'px';
	$('#pre_footer').css('margin-bottom', '-'+height);
	$('#push_footer').css('height', height);
})();
