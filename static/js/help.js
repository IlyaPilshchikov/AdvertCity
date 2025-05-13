function toggleHelpForm() {
    const helpForm = document.getElementById('help-form');
    helpForm.style.display = helpForm.style.display === 'block' ? 'none' : 'block';
    if(helpForm.style.display === 'none') {
        document.getElementById('help-form-fields').reset();
        document.getElementById('form-success-message').style.display = 'none';
    }
}

document.getElementById('help-form-fields').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this);

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            document.getElementById('form-success-message').style.display = 'block';
            this.reset();
            setTimeout(toggleHelpForm, 3000);
        } else {
            alert('Ошибка при отправке: ' + data.message);
        }
    })
    .catch(error => {
        alert('Произошла ошибка: ' + error.message);
    });
});