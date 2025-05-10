function toggleHelpForm() {
    const helpForm = document.getElementById('help-form');
    helpForm.style.display = helpForm.style.display === 'block' ? 'none' : 'block';
    // Сбрасываем форму и скрываем сообщение при закрытии
    if(helpForm.style.display === 'none') {
        document.getElementById('help-form-fields').reset();
        document.getElementById('form-success-message').style.display = 'none';
    }
}

document.getElementById('help-form-fields').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Собираем данные формы
    const formData = new FormData(this);
    
    // Отправляем данные на сервер
    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            // Показываем сообщение об успехе
            document.getElementById('form-success-message').style.display = 'block';
            // Очищаем форму
            this.reset();
            // Можно автоматически закрыть форму через несколько секунд
            setTimeout(toggleHelpForm, 3000);
        } else {
            alert('Ошибка при отправке: ' + data.message);
        }
    })
    .catch(error => {
        alert('Произошла ошибка: ' + error.message);
    });
});