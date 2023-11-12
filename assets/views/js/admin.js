
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
                swalBs.showLoading();
                
                let response = await $.ajax({
                        url : '/admin/addUser',
                        method : 'POST',
                        data : {
                            username : username,
                            scopes : scopes
                        }
                    });
                response = JSON.parse(response);

                if (response.error){
                    Swal.showValidationMessage(
                        response.error
                    )
                    return false;
                }else if (response.url){
                    swalBs.fire({
                        title: "Success",
                        text: response.url,
                        icon: "success"
                    });
                }
            }
        });
    });
});