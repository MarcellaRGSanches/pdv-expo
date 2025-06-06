import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal, Button, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import * as Linking from 'expo-linking';

type Product = {
    id: string;
    title: string;
    image: string;
    quantity: number;
    price: number;
};

type Order = {
    id: string;
    date: string;
    status: string;
	totalPrice: number;
    products: Product[];
};

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const { user } = useAuth();
    const router = useRouter();

    // Buscar produtos do serviço ao abrir o modal de novo pedido
    const fetchProducts = async () => {
        try {
			fetch('https://getproducts-wxmeentkrq-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user?.email,
            }),
        })
            .then(response => response.json()).then(data => {
            // Adiciona campo quantity para controle local
            const productsWithQuantity = data.map((p: any, idx: number) => ({
                id: p.productId,
                title: p.productName,
                image: p.image,
                price: Number(p.price),
                quantity: 0,
            }));
            setProducts(productsWithQuantity);
		});
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os produtos.');
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://getorder-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user?.email,
                }),
            });
            const data = await response.json();
            const adapted: Order[] = data.map((order: any) => ({
                id: order.orderId,
                date: order.creationDate?.split(',')[0]?.replace(/\//g, '/') || '',
                status: order.status,
                totalPrice: order.totalPrice,
                products: (order.products || []).map((p: any) => ({
                    title: p.productName,
                    image: p.image,
                    quantity: Number(p.quantity),
                    price: p.price
                })),
            }));
            setOrders(adapted);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const renderProduct = (product: Product, idx: number) => (
        <View key={idx} style={styles.productRow}>
            <Image source={{ uri: product.image }} style={styles.image} />
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productQty}>Qtd: {product.quantity}</Text>
            <Text style={styles.productPrice}>R$ {product.price}</Text>
        </View>
    );

    // --- Modal Novo Pedido ---
    const handleQuantity = (id: string, delta: number) => {
        setProducts(prev =>
            prev.map(p =>
                p.id === id
                    ? { ...p, quantity: Math.max(0, p.quantity + delta) }
                    : p
            )
        );
    };

    const handleCreateOrder = async () => {
        const selectedProducts = products.filter(p => p.quantity > 0);
        if (selectedProducts.length === 0) {
            Alert.alert('Selecione pelo menos um produto.');
            return;
        }
        
        const productsPayload = selectedProducts.map(p => ({
            productId: p.id,
            productName: p.title,
            price: p.price,
            quantity: String(p.quantity),
            image: p.image,
        }));

        const orderPayload = {
            email: user?.email,
            name: user?.name,
            phone: user?.phone,
            products: productsPayload,
        };

        try {
            const response = await fetch('https://createorder-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload),
            });
            if (response.ok) {
                Alert.alert('Sucesso', 'Pedido criado com sucesso!');
                setModalVisible(false);
                setProducts(products.map(p => ({ ...p, quantity: 0 })));
                fetchOrders(); // <-- Atualiza a lista!
            } else {
                Alert.alert('Erro', 'Não foi possível criar o pedido.');
            }
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro ao criar o pedido.');
        }
    };

    // Calcule o valor total dos produtos selecionados
const total = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

// Adicione esta função no início do componente
function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'aguardando pagamento':
      return '#FFA500'; // laranja
    case 'pagamento confirmado':
      return '#007AFF'; // azul
    case 'em produção':
      return '#8e44ad'; // roxo
    case 'finalizado':
      return '#27ae60'; // verde
    default:
      return '#333'; // padrão
  }
}

const handleWhatsapp = (orderId: string) => {
  const phone = '5511954220341';
  const message = `Obaa! Vi que meu pedido ${orderId} foi finalizado!! Gostaria de combinar a entrega.`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  Linking.openURL(url);
};

    return (
        <View style={{ flex: 1 }}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <Text style={styles.userName}>{user?.name}</Text>
                <TouchableOpacity onPress={() => router.push('/profile')}>
                    <Text style={styles.profileLink}>Perfil</Text>
                </TouchableOpacity>
            </View>

            {/* Botão Novo Pedido */}
            <TouchableOpacity
                style={styles.newOrderBtn}
                onPress={async () => {
                    await fetchProducts();
                    setModalVisible(true);
                }}
            >
                <Ionicons name="add" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.newOrderText}>Novo pedido</Text>
            </TouchableOpacity>

            {/* Modal Novo Pedido */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Botão X de fechar */}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Novo Pedido</Text>
                        <FlatList
                            data={products}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.modalProductRow}>
                                    <Image source={{ uri: item.image }} style={styles.modalimage} />
                                    <Text style={styles.modalProductTitle}>{item.title}</Text>
                                    {/* Preço do produto */}
                                    <Text style={styles.modalProductPrice}>R$ {item.price}</Text>
                                    <View style={styles.qtyController}>
                                        <TouchableOpacity onPress={() => handleQuantity(item.id, -1)}>
                                            <Ionicons name="remove-circle-outline" size={28} color="#7c3aed" />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => handleQuantity(item.id, 1)}>
                                            <Ionicons name="add-circle-outline" size={28} color="#7c3aed" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            style={{ marginBottom: 16 }}
                        />
                        {/* Valor total */}
                        <View style={styles.totalContainer}>
                            <Text style={styles.totalLabel}>Total:</Text>
                            <Text style={styles.totalValue}>R$ {total.toFixed(2) || ''}</Text>
                        </View>
                        <TouchableOpacity style={styles.createOrderBtn} onPress={handleCreateOrder}>
                            <Text style={styles.createOrderText}>Criar pedido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Orders List */}
            <FlatList
                data={orders}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View style={styles.orderContainer}>
                        <TouchableOpacity
                            style={styles.orderHeader}
                            onPress={() => setExpanded(expanded === item.id ? null : item.id)}
                        >
                            <Text style={styles.orderId}>{item.id}</Text>
                            <Text style={styles.orderDate}>{item.date}</Text>
                        </TouchableOpacity>
                        {expanded === item.id && (
                            <View style={styles.productsList}>
                                {item.products.map(renderProduct)}
                                <View style={styles.statusTotalRow}>
                                  <Text
                                    style={[
                                      styles.statusText,
                                      { color: getStatusColor(item.status) }
                                    ]}
                                  >
                                    {item.status}
                                  </Text>
                                  <Text style={styles.orderTotalText}>
                                    Total: <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>R$ {item.totalPrice?.toFixed(2) ?? '0.00'}</Text>
                                  </Text>
                                </View>
                                {/* Botão WhatsApp se finalizado */}
                                {item.status.toLowerCase() === 'finalizado' && (
                                  <TouchableOpacity
                                    style={styles.whatsappBtn}
                                    onPress={() => handleWhatsapp(item.id)}
                                  >
                                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" style={{ marginRight: 8 }} />
                                    <Text style={styles.whatsappBtnText}>Combinar entrega</Text>
                                  </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    profileLink: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    newOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7c3aed',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignSelf: 'center',
        marginVertical: 16,
    },
    newOrderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '92%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 8,
        maxHeight: '85%',
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        padding: 4,
    },
    modalTitle: {
        fontWeight: 'bold',
        fontSize: 22,
        marginBottom: 18,
        textAlign: 'center',
        marginTop: 8,
    },
    modalProductRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    modalimage: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 14,
        backgroundColor: '#eee',
    },
    modalProductTitle: {
        flex: 1,
        fontWeight: '500',
        fontSize: 16,
    },
    qtyController: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    qtyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 8,
        minWidth: 24,
        textAlign: 'center',
    },
    createOrderBtn: {
        backgroundColor: '#7c3aed',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    createOrderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    orderContainer: {
        marginBottom: 12,
        backgroundColor: '#fafafa',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#f0f0f0',
    },
    orderId: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    orderDate: {
        color: '#888',
        fontSize: 14,
    },
    productsList: {
        padding: 12,
        backgroundColor: '#fff',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    image: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    productTitle: {
        flex: 1,
        fontWeight: '500',
        fontSize: 15,
    },
    productQty: {
        marginLeft: 8,
        fontSize: 14,
        color: '#555',
    },
    productPrice: {
        marginLeft: 8,
        fontWeight: 'bold',
        fontSize: 15,
        color: '#007AFF',
    },
    statusText: {
        marginTop: 8,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
        gap: 8,
    },
    totalLabel: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7c3aed',
        marginLeft: 8,
    },
    modalProductPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#007AFF',
        marginHorizontal: 8,
        minWidth: 70,
        textAlign: 'right',
    },
    statusTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 4,
    },
    orderTotalText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        backgroundColor: '#f3f0ff',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    whatsappBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e9f9ee',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      marginTop: 16,
      alignSelf: 'center',
    },
    whatsappBtnText: {
      color: '#25D366',
      fontWeight: 'bold',
      fontSize: 16,
    },
});
