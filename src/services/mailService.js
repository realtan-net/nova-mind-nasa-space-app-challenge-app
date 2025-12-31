import nodemailer from "nodemailer";

// SMTP bağlantı ayarları
// Gerçek bilgiler daha sonra eklenecek
const transporter = nodemailer.createTransport({
  host: "SMTP_HOST_HERE",   // SMTP sunucu adresi
  port: 587,               
  secure: false,           
  auth: {
    user: "SMTP_USER_HERE", // SMTP kullanıcı adı
    pass: "SMTP_PASS_HERE", // SMTP şifre / key
  },
});

// Mail gönderme fonksiyonu
export async function sendMail(to, subject, text) {
  return transporter.sendMail({
    from: "no-reply@domain.com", // Gönderen adres
    to,                          // Alıcı
    subject,                     // Mail konusu
    text,                        // Mail içeriği
  });
}
