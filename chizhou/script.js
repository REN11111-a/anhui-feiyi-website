document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('heritageSlider');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    const cards = document.querySelectorAll('.heritage-card');

    // 左右滑动逻辑
    prevBtn.addEventListener('click', () => {
        slider.scrollBy({ left: -300, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
        slider.scrollBy({ left: 300, behavior: 'smooth' });
    });

    // 点击卡片跳转详情页
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const targetUrl = card.getAttribute('data-target');
            if (targetUrl) {
                window.location.href = targetUrl;
            }
        });
    });
});