import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

type Product = {
    productId: string;
    productName: string;
    image: string;
    price: number;
    disabled?: boolean;
};

type Order = {
    id: string;
    date: string;
    status: string;
    totalPrice: number;
    products: {
        id: string;
        title: string;
        image: string;
        quantity: number;
        price: number;
    }[];
    clientName: string;
    clientEmail: string;
    clientPhone: string;
};

const STATUS_OPTIONS = [
    { label: 'Aguardando pagamento', value: 'Aguardando pagamento' },
    { label: 'Pagamento confirmado', value: 'Pagamento Confirmado' },
    { label: 'Em produção', value: 'Em Produção' },
    { label: 'Finalizado', value: 'Finalizado' },
];

export default function OrdersAdminScreen() {
    const [tab, setTab] = useState<'orders' | 'products'>('orders');

    // Orders state
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [status, setStatus] = useState('');
    const { user } = useAuth();

    // Products state
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);
    const [editProductModalVisible, setEditProductModalVisible] = useState(false);
    const [productForm, setProductForm] = useState({ productName: '', image: '', price: '' });
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [editProductForm, setEditProductForm] = useState({ productName: '', image: '', price: '' });
    const [editProductLoading, setEditProductLoading] = useState(false);

    // Imagem
    const [productImage, setProductImage] = useState<string>('');
    const [editProductImage, setEditProductImage] = useState<string>('');

    // --- ORDERS LOGIC ---
    useEffect(() => {
        if (tab === 'orders') {
            setLoading(true);
            fetch('https://getorder-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isAdmin: user?.isAdmin || false,
                }),
            })
                .then(response => response.json())
                .then(data => {
                    const adapted: Order[] = data.map((order: any) => ({
                        id: order.orderId,
                        date: order.creationDate?.split(',')[0]?.replace(/\//g, '/') || '',
                        status: order.status,
                        totalPrice: order.totalPrice,
                        clientName: order.name || '',
                        clientEmail: order.email || '',
                        clientPhone: order.phone || '',
                        products: (order.products || []).map((p: any) => ({
                            id: p.productId,
                            title: p.productName,
                            image: p.image,
                            quantity: Number(p.quantity),
                            price: p.price
                        })),
                    }));
                    setOrders(adapted);
                })
                .catch(error => console.error(error))
                .finally(() => setLoading(false));
        }
    }, [tab, user?.isAdmin]);

    const renderProductOrder = (product: any, idx: number) => (
        <View key={idx} style={styles.productRow}>
            <Image source={{ uri: product.image }} style={styles.image} />
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productQty}>Qtd: {product.quantity}</Text>
            <Text style={styles.productPrice}>R$ {product.price}</Text>
        </View>
    );

    const handleOpenDetail = (order: Order) => {
        setSelectedOrder(order);
        setStatus(order.status);
        setModalVisible(true);
    };

    const handleChangeStatus = async (newStatus: string) => {
        setStatus(newStatus);
        try {
            const response = await fetch('https://updateorder-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder?.id,
                    status: newStatus,
                }),
            });
            if (response.ok) {
                Alert.alert('Sucesso', 'Status atualizado!');
                setOrders(prev =>
                    prev.map(o =>
                        o.id === selectedOrder?.id ? { ...o, status: newStatus } : o
                    )
                );
                setSelectedOrder(prev =>
                    prev ? { ...prev, status: newStatus } : prev
                );
            } else {
                Alert.alert('Erro', 'Não foi possível atualizar o status.');
            }
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro ao atualizar o status.');
        }
    };

    function getStatusColor(status: string) {
        switch (status.toLowerCase()) {
            case 'aguardando pagamento':
                return '#FFA500';
            case 'pagamento confirmado':
                return '#007AFF';
            case 'em produção':
                return '#8e44ad';
            case 'finalizado':
                return '#27ae60';
            default:
                return '#333';
        }
    }

    // --- PRODUCTS LOGIC ---
    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await fetch('https://getproducts-wxmeentkrq-uc.a.run.app');
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os produtos.');
        } finally {
            setProductsLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'products') {
            fetchProducts();
        }
    }, [tab]);

    const handleAddProduct = async () => {
        if (!productForm.productName || !productForm.image || !productForm.price) {
            Alert.alert('Preencha todos os campos!');
            return;
        }
        try {
            const response = await fetch('https://createproduct-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: productForm.productName,
                    image: productForm.image,
                    price: Number(productForm.price),
                }),
            });
            if (response.ok) {
                Alert.alert('Produto cadastrado!');
                setProductModalVisible(false);
                setProductForm({ productName: '', image: '', price: '' });
                fetchProducts();
            } else {
                Alert.alert('Erro ao cadastrar produto.');
            }
        } catch (error) {
            Alert.alert('Erro ao cadastrar produto.');
        }
    };

    const handleOpenEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setEditProductForm({
            productName: product.productName,
            image: product.image,
            price: String(product.price),
        });
        setEditProductModalVisible(true);
    };

    const handleEditProduct = async () => {
        if (!selectedProduct) return;
        setEditProductLoading(true);
        try {
            const response = await fetch('https://updateproduct-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.productId,
                    productName: editProductForm.productName,
                    image: editProductForm.image,
                    price: Number(editProductForm.price),
                }),
            });
            if (response.ok) {
                Alert.alert('Produto atualizado!');
                setEditProductModalVisible(false);
                fetchProducts();
            } else {
                Alert.alert('Erro ao atualizar produto.');
            }
        } catch (error) {
            Alert.alert('Erro ao atualizar produto.');
        } finally {
            setEditProductLoading(false);
        }
    };

    const handleDisableProduct = async () => {
        if (!selectedProduct) return;
        setEditProductLoading(true);
        try {
            const response = await fetch('https://updateproduct-wxmeentkrq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.productId,
                    disabled: true,
                }),
            });
            if (response.ok) {
                Alert.alert('Produto desabilitado!');
                setEditProductModalVisible(false);
                fetchProducts();
            } else {
                Alert.alert('Erro ao desabilitar produto.');
            }
        } catch (error) {
            Alert.alert('Erro ao desabilitar produto.');
        } finally {
            setEditProductLoading(false);
        }
    };

    // Função para selecionar imagem (para cadastro)
    const pickProductImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0].uri) {
            setProductImage(result.assets[0].uri);
            setProductForm(f => ({ ...f, image: result.assets[0].uri }));
        }
    };

    // Função para selecionar imagem (para edição)
    const pickEditProductImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0].uri) {
            setEditProductImage(result.assets[0].uri);
            setEditProductForm(f => ({ ...f, image: result.assets[0].uri }));
        }
    };

    // --- UI ---
    return (
        <View style={{ flex: 1 }}>
            <View style={styles.topBar}>
                <Text style={styles.userName}>{user?.name}</Text>
                <TouchableOpacity onPress={() => router.push('/profile')}>
                    <Text style={styles.profileLink}>Perfil</Text>
                </TouchableOpacity>
            </View>
            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'orders' && styles.tabBtnActive]}
                    onPress={() => setTab('orders')}
                >
                    <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>Pedidos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]}
                    onPress={() => setTab('products')}
                >
                    <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>Produtos</Text>
                </TouchableOpacity>
            </View>

            {/* Orders Tab */}
            {tab === 'orders' && (
                <>
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
                                        {item.products.map(renderProductOrder)}
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
                                        <TouchableOpacity
                                            style={styles.detailBtn}
                                            onPress={() => handleOpenDetail(item)}
                                        >
                                            <Ionicons name="information-circle-outline" size={20} color="#7c3aed" />
                                            <Text style={styles.detailBtnText}>Detalhe do pedido</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    />

                    {/* Modal de Detalhe do Pedido */}
                    <Modal
                        visible={modalVisible}
                        animationType="slide"
                        transparent
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={28} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
                                {selectedOrder && (
                                    <>
                                        <View style={styles.clientInfo}>
                                            <Text style={styles.clientLabel}>Nome: <Text style={styles.clientValue}>{selectedOrder.clientName}</Text></Text>
                                            <Text style={styles.clientLabel}>Email: <Text style={styles.clientValue}>{selectedOrder.clientEmail}</Text></Text>
                                            <Text style={styles.clientLabel}>Telefone: <Text style={styles.clientValue}>{selectedOrder.clientPhone}</Text></Text>
                                        </View>
                                        <FlatList
                                            data={selectedOrder.products}
                                            keyExtractor={item => item.id}
                                            renderItem={({ item }) => (
                                                <View style={styles.modalProductRow}>
                                                    <Image source={{ uri: item.image }} style={styles.modalimage} />
                                                    <Text style={styles.modalProductTitle}>{item.title}</Text>
                                                    <Text style={styles.modalProductPrice}>R$ {item.price}</Text>
                                                    <Text style={styles.qtyText}>Qtd: {item.quantity}</Text>
                                                </View>
                                            )}
                                            style={{ marginBottom: 16 }}
                                        />
                                        <View style={styles.statusTotalRow}>
                                            <Text
                                                style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}
                                            >
                                                {selectedOrder.status}
                                            </Text>
                                            <Text style={styles.orderTotalText}>
                                                Total: <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>R$ {selectedOrder.totalPrice?.toFixed(2) ?? '0.00'}</Text>
                                            </Text>
                                        </View>
                                        <View style={styles.pickerContainer}>
                                            <Text style={styles.pickerLabel}>Alterar status:</Text>
                                            <Picker
                                                selectedValue={status}
                                                style={styles.picker}
                                                onValueChange={handleChangeStatus}
                                            >
                                                {STATUS_OPTIONS.map(opt => (
                                                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                                                ))}
                                            </Picker>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </Modal>
                </>
            )}

            {/* Products Tab */}
            {tab === 'products' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.productsHeader}>
                        <Text style={styles.productsTitle}></Text>
                        <TouchableOpacity style={styles.addProductBtn} onPress={() => setProductModalVisible(true)}>
                            <Ionicons name="add" size={22} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.addProductBtnText}>Adicionar produto</Text>
                        </TouchableOpacity>
                    </View>
                    {productsLoading ? (
                        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 32 }} />
                    ) : (
                        <FlatList
                            data={products}
                            keyExtractor={item => item.productId}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.productListItem,
                                        item.disabled && styles.productListItemDisabled
                                    ]}
                                    onPress={() => handleOpenEditProduct(item)}
                                >
                                    <Image source={{ uri: item.image }} style={styles.productListImage} />
                                    <Text style={styles.productListName}>{item.productName}</Text>
                                    <Text style={styles.productListPrice}>R$ {Number(item.price).toFixed(2)}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}

                    {/* Modal Adicionar Produto */}
                    <Modal
                        visible={productModalVisible}
                        animationType="slide"
                        transparent
                        onRequestClose={() => setProductModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setProductModalVisible(false)}>
                                    <Ionicons name="close" size={28} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Adicionar Produto</Text>
                                {/* Input de imagem */}
                                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickProductImage}>
                                    {productForm.image ? (
                                        <Image source={{ uri: productForm.image }} style={styles.productImagePreview} />
                                    ) : (
                                        <Ionicons name="image" size={40} color="#aaa" />
                                    )}
                                    <Text style={styles.imagePickerText}>
                                        {productForm.image ? 'Trocar imagem' : 'Selecionar imagem'}
                                    </Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nome do produto"
                                    value={productForm.productName}
                                    onChangeText={text => setProductForm(f => ({ ...f, productName: text }))}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Preço"
                                    value={productForm.price}
                                    onChangeText={text => setProductForm(f => ({ ...f, price: text }))}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity style={styles.createOrderBtn} onPress={handleAddProduct}>
                                    <Text style={styles.createOrderText}>Cadastrar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    {/* Modal Editar Produto */}
                    <Modal
                        visible={editProductModalVisible}
                        animationType="slide"
                        transparent
                        onRequestClose={() => setEditProductModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setEditProductModalVisible(false)}>
                                    <Ionicons name="close" size={28} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Editar Produto</Text>
                                {/* Input de imagem */}
                                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickEditProductImage}>
                                    {editProductForm.image ? (
                                        <Image source={{ uri: editProductForm.image }} style={styles.productImagePreview} />
                                    ) : (
                                        <Ionicons name="image" size={40} color="#aaa" />
                                    )}
                                    <Text style={styles.imagePickerText}>
                                        {editProductForm.image ? 'Trocar imagem' : 'Selecionar imagem'}
                                    </Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nome do produto"
                                    value={editProductForm.productName}
                                    onChangeText={text => setEditProductForm(f => ({ ...f, productName: text }))}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Preço"
                                    value={editProductForm.price}
                                    onChangeText={text => setEditProductForm(f => ({ ...f, price: text }))}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={styles.createOrderBtn}
                                    onPress={handleEditProduct}
                                    disabled={editProductLoading}
                                >
                                    <Text style={styles.createOrderText}>
                                        {editProductLoading ? 'Salvando...' : 'Salvar'}
                                    </Text>
                                </TouchableOpacity>

                                {selectedProduct?.disabled ? (
                                    <TouchableOpacity
                                        style={styles.disableProductBtnFull}
                                        onPress={async () => {
                                            setEditProductLoading(true);
                                            try {
                                                const response = await fetch('https://updateproduct-wxmeentkrq-uc.a.run.app', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        productId: selectedProduct.productId,
                                                        disabled: false,
                                                    }),
                                                });
                                                if (response.ok) {
                                                    Alert.alert('Produto habilitado!');
                                                    setEditProductModalVisible(false);
                                                    fetchProducts();
                                                } else {
                                                    Alert.alert('Erro ao habilitar produto.');
                                                }
                                            } catch (error) {
                                                Alert.alert('Erro ao habilitar produto.');
                                            } finally {
                                                setEditProductLoading(false);
                                            }
                                        }}
                                        disabled={editProductLoading}
                                    >
                                        <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                                        <Text style={[styles.disableProductBtnText, { color: '#27ae60' }]}>Habilitar produto</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.disableProductBtnFull}
                                        onPress={handleDisableProduct}
                                        disabled={editProductLoading}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#e74c3c" />
                                        <Text style={styles.disableProductBtnText}>Desabilitar produto</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </Modal>
                </View>
            )}
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
    statusTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap', // Permite quebrar linha se necessário
        marginTop: 12,
        paddingHorizontal: 4,
        gap: 8, // Espaço entre status e total
    },
    orderTotalText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        backgroundColor: '#f3f0ff',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        minWidth: 120, // Garante largura mínima
        textAlign: 'right',
        flexShrink: 0, // Não deixa o texto encolher
    },
    statusText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        flexShrink: 1, // Permite o status encolher se necessário
        marginRight: 8,
    },
    detailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 12,
        backgroundColor: '#e9e7fd',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    detailBtnText: {
        color: '#7c3aed',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 6,
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
    modalProductPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#007AFF',
        marginHorizontal: 8,
        minWidth: 70,
        textAlign: 'right',
    },
    qtyText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        minWidth: 40,
        textAlign: 'center',
    },
    clientInfo: {
        marginBottom: 16,
        backgroundColor: '#f8f8ff',
        borderRadius: 8,
        padding: 12,
    },
    clientLabel: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#444',
        marginBottom: 2,
    },
    clientValue: {
        fontWeight: 'normal',
        color: '#222',
    },
    pickerContainer: {
        marginTop: 18,
        marginBottom: 8,
    },
    pickerLabel: {
        fontWeight: 'bold',
        fontSize: 15,
        marginBottom: 4,
        color: '#333',
    },
    picker: {
        backgroundColor: '#f3f0ff',
        borderRadius: 8,
        marginTop: 2,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f0ff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderColor: 'transparent',
    },
    tabBtnActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#fff',
    },
    tabText: {
        fontSize: 16,
        color: '#888',
        fontWeight: 'bold',
    },
    tabTextActive: {
        color: '#7c3aed',
    },
    productsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    productsTitle: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    addProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7c3aed',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
    },
    addProductBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    productListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    productListItemDisabled: {
        backgroundColor: '#e0e0e0',
        opacity: 0.6,
    },
    productListImage: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 14,
        backgroundColor: '#eee',
    },
    productListName: {
        flex: 1,
        fontWeight: '500',
        fontSize: 16,
    },
    productListPrice: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#007AFF',
        marginRight: 12,
    },
    productDetailBtn: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#f3f0ff',
    },
    disableProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginBottom: 8,
        backgroundColor: '#fdecea',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    disableProductBtnText: {
        color: '#e74c3c',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    createOrderBtn: {
        backgroundColor: '#7c3aed',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 0,
        marginBottom: 0,
        width: '100%', // garante largura total
    },
    createOrderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    imagePickerBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#fafafa',
    },
    imagePickerText: {
        marginTop: 6,
        color: '#7c3aed',
        fontWeight: 'bold',
        fontSize: 15,
    },
    productImagePreview: {
        width: 80,
        height: 80,
        borderRadius: 10,
        marginBottom: 4,
        backgroundColor: '#eee',
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    disableProductBtnFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fdecea',
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 12,
        width: '100%', // garante largura total
    },
});
