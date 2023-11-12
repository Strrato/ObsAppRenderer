
window.swalBs = Swal.mixin({
    customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false,
    reverseButtons: true,
    showCancelButton: true,
});

window.copyToClipboard = async (containerid) => {
    if (!navigator.clipboard){
        if (document.selection) {
            var range = document.body.createTextRange();
            range.moveToElementText(document.getElementById(containerid));
            range.select().createTextRange();
            document.execCommand("copy");
        } else if (window.getSelection) {
            var range = document.createRange();
            range.selectNode(document.getElementById(containerid));
            window.getSelection().addRange(range);
            document.execCommand("copy");
        }
        return true;
    }else {
        let text = document.getElementById(containerid).innerText.trim();
        return await navigator.clipboard.writeText(text);
    }
  }

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

function displayToken(){
    let content = $('#token-content').text().trim();

    swalBs.fire({
        title: "Token",
        text : content,
        showCloseButton : true,
        confirmButtonText: 'Copy',
        cancelButtonText: 'Close',
        html : `
            <div id="tokenCopyContainer">${content}</div>
            <div class="alert alert-info d-none copyTokenSuccess mt-3">Token copied</div>
        `,
        preConfirm : async () => {
            await copyToClipboard('tokenCopyContainer');
            $('.copyTokenSuccess').removeClass('d-none');
            return false;
        }
    });

}

$(function(){
    $(window).on('resize', setViewPort);

    setViewPort();

    $('.show-token').on('click', () => {
        displayToken();
    });
});