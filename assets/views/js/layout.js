
function setViewPort(){
    $('#app-container').css('height', window.innerHeight+'px');
}

$(function(){
    $(window).on('resize', setViewPort);

    setViewPort();
});