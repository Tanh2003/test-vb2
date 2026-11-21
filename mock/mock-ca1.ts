export const SAMPLE_PARSED_CA1 = {
  examCode: "CA1",
  essay: {
    question: "Chủ tịch Hồ Chí Minh khẳng định: “Tương lai thuộc về thanh niên. Tương lai là cách mạng luôn tiến lên. Là chủ của tương lai, thanh niên không thể không có lý tưởng cao cả. Vì vậy thanh niên phải có cuộc sống chính trị tích cực và cách mạng.” (Hồ Chí Minh toàn tập, Tập 12, NXB Chính trị quốc gia - Sự thật, 2011, trang 519). Anh/chị hãy viết một bài nghị luận (tối thiểu 500 chữ) trình bày cách hiểu của mình về nội dung đoạn trích trên và liên hệ với vai trò của thanh niên trong giai đoạn hiện nay.",
    minWords: 500,
    points: 30
  },
  singleChoices: [
    {
      id: "C01",
      type: "SINGLE",
      level: "BIET",
      content: "Trong không gian véc tơ $\\mathbb{R}^3$, cho hai véc tơ $u_1=(2;-1;3)$, $u_2=(1;2;-3)$. Tổ hợp tuyến tính $2u_1 - u_2$ bằng",
      options: {
        A: "$(3;-4;9)$",
        B: "$(3;0;9)$",
        C: "$(1;-4;6)$",
        D: "$(3;-4;6)$"
      },
      correctAnswer: "A"
    },
    {
      id: "C04",
      type: "SINGLE",
      level: "BIET",
      content: "Cho hai ma trận $A=\\begin{pmatrix} 1 & 1 \\\\ -1 & 1 \\end{pmatrix}$ và $B=\\begin{pmatrix} -1 & 2 \\\\ 1 & 1 \\end{pmatrix}$. Phần tử thuộc hàng một và cột hai của ma trận $A+B$ bằng",
      options: { A: "3", B: "2", C: "1", D: "0" },
      correctAnswer: "A"
    },
    {
      id: "C09",
      type: "SINGLE",
      level: "VAN_DUNG",
      content: "Cho hàm số $f(x)=\\begin{cases} \\frac{\\sqrt[3]{1+3x}-1-x}{x} & \\text{khi } x \\neq 0 \\\\ a & \\text{khi } x = 0 \\end{cases}$. Tập hợp tất cả các giá trị của $a$ để hàm số đã cho liên tục trên $\\mathbb{R}$ là",
      options: { A: "$\\{0\\}$", B: "$\\{1\\}$", C: "$\\emptyset$", D: "$\\{0;1\\}$" },
      correctAnswer: "A"
    }
  ],
  groupQuestions: [
    {
      groupId: "N1",
      context: "Trong không gian véc tơ $\\mathbb{R}^3$, cho hệ véc tơ $S = \\{u_1(3;2;2); u_2(2;3;2); u_3(2;2;3)\\}$. Gọi $A$ là ma trận có các dòng theo thứ tự là các véc tơ trong $S$.",
      subQuestions: [
        {
          id: "C40",
          level: "HIEU",
          content: "Mệnh đề nào sau đây là sai?",
          options: {
            A: "Hệ $S$ phụ thuộc tuyến tính.",
            B: "Hệ $\\{u_1, u_3\\}$ độc lập tuyến tính.",
            C: "Hệ $S$ độc lập tuyến tính.",
            D: "Hệ $\\{u_1, u_2\\}$ độc lập tuyến tính."
          },
          correctAnswer: "A"
        },
        {
          id: "C41",
          level: "HIEU",
          content: "Định thức của ma trận $A$ bằng",
          options: { A: "5", B: "7", C: "0", D: "15" },
          correctAnswer: "B"
        },
        {
          id: "C42",
          level: "VAN_DUNG",
          content: "Gọi $X$ là tập hợp các trị riêng của $A$, tổng bình phương các phần tử của $X$ bằng",
          options: { A: "50", B: "51", C: "9", D: "10" },
          correctAnswer: "A"
        }
      ]
    }
  ],
  shortAnswers: [
    {
      id: "C46",
      type: "SHORT",
      level: "VAN_DUNG",
      content: "Cho $A=(a_{ij})$ là ma trận vuông cấp 3 với $a_{ij} = i^2 + j - \\min\\{i,j\\}$. Gọi $A^T$ là ma trận chuyển vị của $A$, tính $\\det(2A^T)$.",
      correctAnswer: "48"
    },
    {
      id: "C47",
      type: "SHORT",
      level: "HIEU",
      content: "Gọi $M(a,b,c)$ là điểm cực trị của hàm số $f(x,y,z) = x^2 + y^2 + z^2 - 4x - 6y + 2z + 2026$. Tính $2a - b + c$.",
      correctAnswer: "0"
    }
  ]
};