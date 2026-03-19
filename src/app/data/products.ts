import { Product, User } from "../types/product";

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    phone: "0912345678",
    joinedDate: "2024-01-15"
  },
  {
    id: "2",
    name: "Trần Thị B",
    email: "tranthib@example.com",
    phone: "0987654321",
    joinedDate: "2024-02-20"
  },
  {
    id: "3",
    name: "Lê Văn C",
    email: "levanc@example.com",
    phone: "0901234567",
    joinedDate: "2024-03-10"
  }
];

export const products: Product[] = [
  {
    id: "1",
    name: "Vintage Denim Jacket - Levi's 501",
    price: 450000,
    image: "https://images.unsplash.com/photo-1556041068-5874261f23e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwZGVuaW0lMjBqYWNrZXR8ZW58MXx8fHwxNzczODEzNDY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Áo khoác",
    description: "Áo khoác denim Levi's 501 chính hãng, đã qua sử dụng nhưng vẫn còn rất mới. Màu xanh vintage cực đẹp, phù hợp với mọi phong cách.",
    condition: "Very Good",
    size: "L",
    brand: "Levi's",
    location: "Quận 1, TP.HCM",
    seller: mockUsers[0],
    postedDate: "2026-03-18",
    views: 124
  },
  {
    id: "2",
    name: "Giày Da Thật Nam - Size 42",
    price: 680000,
    image: "https://images.unsplash.com/photo-1653868250450-b83e6263d427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWNvbmRoYW5kJTIwbGVhdGhlciUyMHNob2VzfGVufDF8fHx8MTc3Mzg5MDEyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Giày dép",
    description: "Giày da thật cao cấp, mua ở shop nổi tiếng. Đi được 3 tháng, bảo quản rất kỹ. Màu nâu cổ điển, rất sang trọng.",
    condition: "Like New",
    size: "42",
    brand: "Clarks",
    location: "Quận 3, TP.HCM",
    seller: mockUsers[1],
    postedDate: "2026-03-17",
    views: 89
  },
  {
    id: "3",
    name: "Túi Xách Nữ Vintage",
    price: 320000,
    image: "https://images.unsplash.com/photo-1637043398520-4dec20e83d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwaGFuZGJhZyUyMHB1cnNlfGVufDF8fHx8MTc3Mzg5MDEyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Phụ kiện",
    description: "Túi xách nữ phong cách vintage, chất liệu da PU cao cấp. Nhiều ngăn tiện lợi, size vừa phải để đi làm hoặc đi chơi.",
    condition: "Good",
    brand: "Zara",
    location: "Quận 7, TP.HCM",
    seller: mockUsers[2],
    postedDate: "2026-03-16",
    views: 156
  },
  {
    id: "4",
    name: "Giày Thể Thao Nike Air Max",
    price: 890000,
    image: "https://images.unsplash.com/photo-1663993266342-14cbf1995b8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VkJTIwc25lYWtlcnMlMjBzaG9lc3xlbnwxfHx8fDE3NzM4OTAxMjl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Giày dép",
    description: "Nike Air Max chính hãng, mua tại store Nike. Đi được 6 tháng, vẫn còn rất đẹp và êm. Có hộp và phụ kiện đầy đủ.",
    condition: "Very Good",
    size: "40",
    brand: "Nike",
    location: "Quận Bình Thạnh, TP.HCM",
    seller: mockUsers[0],
    postedDate: "2026-03-15",
    views: 203
  },
  {
    id: "5",
    name: "Áo Thun Vintage Oversize",
    price: 180000,
    image: "https://images.unsplash.com/photo-1759941279446-dea2722bca33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwdHNoaXJ0JTIwY2xvdGhpbmd8ZW58MXx8fHwxNzczODkwMTI5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Áo",
    description: "Áo thun form oversize cực chất, phong cách vintage retro. Chất cotton 100%, mặc rất thoáng mát và thoải mái.",
    condition: "Like New",
    size: "M",
    brand: "Unbranded",
    location: "Quận 10, TP.HCM",
    seller: mockUsers[1],
    postedDate: "2026-03-14",
    views: 78
  },
  {
    id: "6",
    name: "Váy Hoa Vintage",
    price: 350000,
    image: "https://images.unsplash.com/photo-1599447539809-bf4288acc7c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWNvbmRoYW5kJTIwZHJlc3MlMjBmYXNoaW9ufGVufDF8fHx8MTc3Mzg5MDEzMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Đầm/Váy",
    description: "Váy hoa midi phong cách vintage, rất xinh và nữ tính. Chất vải mềm mại, thoáng mát. Phù hợp đi dạo phố hoặc đi biển.",
    condition: "Very Good",
    size: "S",
    brand: "H&M",
    location: "Quận 2, TP.HCM",
    seller: mockUsers[2],
    postedDate: "2026-03-13",
    views: 167
  },
  {
    id: "7",
    name: "Khăn Quàng Cổ Lụa",
    price: 120000,
    image: "https://images.unsplash.com/photo-1743324690702-d33036a5f904?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwc2NhcmYlMjBhY2Nlc3Nvcmllc3xlbnwxfHx8fDE3NzM4OTAxMzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Phụ kiện",
    description: "Khăn quàng cổ lụa thật, họa tiết vintage sang trọng. Có thể quàng cổ hoặc buộc túi đều đẹp. Chất liệu mềm mại, nhẹ nhàng.",
    condition: "Like New",
    brand: "Local Brand",
    location: "Quận Tân Bình, TP.HCM",
    seller: mockUsers[0],
    postedDate: "2026-03-12",
    views: 92
  },
  {
    id: "8",
    name: "Boots Da Cao Cổ",
    price: 750000,
    image: "https://images.unsplash.com/photo-1704411616472-1f3ffeb4f979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VkJTIwYm9vdHMlMjBmb290d2VhcnxlbnwxfHx8fDE3NzM4OTAxMzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Giày dép",
    description: "Boots da cao cổ phong cách cổ điển. Chất liệu da thật, đế cao su chống trơn. Đã qua sử dụng nhưng vẫn còn rất bền và đẹp.",
    condition: "Good",
    size: "38",
    brand: "Dr. Martens",
    location: "Quận Phú Nhuận, TP.HCM",
    seller: mockUsers[1],
    postedDate: "2026-03-11",
    views: 145
  }
];

export const categories = [
  "Tất cả",
  "Áo",
  "Quần",
  "Áo khoác",
  "Đầm/Váy",
  "Giày dép",
  "Phụ kiện"
];
