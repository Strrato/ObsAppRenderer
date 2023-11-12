$(function(){
    $('form').on('submit', function(){
        let pass = $('#password').val();
        let ctrl = $('#passwordControl').val();
        if (!pass){
            return false;
        }
        if (!ctrl || pass !== ctrl){
            $('#passwordControl').parent().addClass('has-error');
            $('.checkerr').removeClass('d-none');
            return false;
        }
    });
});