
function setViewPort(){
    $('#app-container').css('height', window.innerHeight+'px');
}

function notifyFail(message){
    console.log(message);
    Swal.fire({
        title: "Error",
        text: message,
        icon: "error"
    });
}

$(function(){
    $(window).on('resize', setViewPort);

    setViewPort();
});