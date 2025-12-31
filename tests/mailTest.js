import { sendMail } from "../src/services/mailService.js";

async function testMail() {
  try {
    await sendMail(
      "kusayhuveydi14@gmail.com",
      "Test Mail",
      "Bu bir test mailidir"
    );
    console.log("Mail gönderildi ");
  } catch (err) {
    console.error("Mail gönderilemedi ❌", err);
  }
}

testMail();
