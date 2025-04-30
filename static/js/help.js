function toggleHelpForm() {
    const helpForm = document.getElementById('help-form');
    helpForm.style.display = helpForm.style.display === 'block' ? 'none' : 'block';
}

document.getElementById('help-form-fields').addEventListener('submit', function(event) {
    event.preventDefault();
    alert('Ваш вопрос отправлен! Мы свяжемся с вами в ближайшее время.');
    toggleHelpForm();
});