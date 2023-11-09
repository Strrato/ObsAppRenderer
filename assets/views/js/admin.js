
const swalBs = Swal.mixin({
    customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false,
    reverseButtons: true,
    showCancelButton: true,
})

$(function(){
    $('.admin-add-user').on('click', function(){
        swalBs.fire({
            title: "Add user",
            text : "Add a new user with link to send password",
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel',
            html: 
                '<input type="text" class="form-control" id="swal-input-username" placeholder="Username">'+
                '<input type="text" class="form-control" id="swal-input-scopes" placeholder="Scopes">',
            preConfirm : async () => {
                let username = $('#swal-input-username').val();
                let scopes = $('#swal-input-scopes').val();
                console.log(username, scopes);
                if (!username || !scopes){
                    Swal.showValidationMessage(
                        `All fields are required`
                    )
                    return false;
                }

                return await new Promise((r, e) => {
                    $.ajax({
                        url : '/admin/addUser',
                        method : 'POST',
                        data : {
                            username : username,
                            scopes : scopes
                        }
                    }).done(response => {
                        console.log(response);
                        r(true);
                    }).fail(err => {
                        notifyFail(err);
                        e(false);
                    });
                })

            }
        }).then(result => {

        });
    });
});