function showOrderForm() {
    document.getElementById('order-form').style.display = 'flex';
}

function hideOrderForm() {
    document.getElementById('order-form').style.display = 'none';
}

document.getElementById('order-form-fields').addEventListener('submit', function(event) {
    event.preventDefault();
    alert('Заказ отправлен!');
    hideOrderForm();
});

document.getElementById('order-form').addEventListener('click', function(event) {
    if (event.target === this) {
        hideOrderForm();
    }
});