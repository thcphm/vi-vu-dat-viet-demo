'use strict';
function markQuizAnswer(button,correct){
  if(button.hasAttribute('data-answer-result'))return;
  button.dataset.answerResult=correct?'correct':'wrong';
  const label=document.createElement('small');
  label.className='answer-mark';
  label.textContent=correct?'✓ Đáp án đúng':'✗ Bạn đã chọn sai';
  (button.querySelector('span')||button).append(label);
}
