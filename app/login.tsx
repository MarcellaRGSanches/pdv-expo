import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Button, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerModal, setRegisterModal] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    photo: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, setUser } = useAuth();

  // useEffect(() => {
  //   console.log('Usuário atualizado:', user);
  // }, [user]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://getuser-wxmeentkrq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setUser(data[0]);
        Alert.alert('Sucesso', 'Login realizado com sucesso!');
        if (data[0]?.isAdmin) {
          Alert.alert('Atenção', 'Você está logado como administrador.');
          router.replace('/(tabs)/orders-admin');
        } else router.replace('/(tabs)/orders');
      } else {
        Alert.alert('Erro', 'Login ou senha inválidos.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://createuser-wxmeentkrq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });
      if (response.ok) {
        Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
        setRegisterModal(false);
        setRegisterData({ name: '', email: '', password: '', photo: '', phone: '' });
      } else {
        Alert.alert('Erro', 'Não foi possível cadastrar. Tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setRegisterData({ ...registerData, photo: result.assets[0].uri });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Image
            source={{ uri: 'https://i.ibb.co/4gpBxD7h/fee7daec-52bd-4ac4-92d1-1b792c89b8b5.png' }}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <Text style={styles.title}>Doceria da Marce</Text>
          <TextInput
            style={styles.input}
            placeholder="Login"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => Alert.alert('Recuperar senha')}>
              <Text style={styles.link}>Esqueci minha senha</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRegisterModal(true)}>
              <Text style={styles.link}>Cadastro</Text>
            </TouchableOpacity>
          </View>

          {/* Modal de Cadastro */}
          <Modal
            visible={registerModal}
            animationType="slide"
            transparent
            onRequestClose={() => setRegisterModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Cadastro</Text>
                <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                  {registerData.photo ? (
                    <Image source={{ uri: registerData.photo }} style={styles.photo} />
                  ) : (
                    <Text style={styles.photoText}>Selecionar Foto</Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Nome"
                  value={registerData.name}
                  onChangeText={name => setRegisterData({ ...registerData, name })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  value={registerData.email}
                  onChangeText={email => setRegisterData({ ...registerData, email })}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  secureTextEntry
                  value={registerData.password}
                  onChangeText={password => setRegisterData({ ...registerData, password })}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefone"
                  value={registerData.phone}
                  onChangeText={phone => setRegisterData({ ...registerData, phone })}
                  keyboardType="phone-pad"
                />
                <View style={styles.modalButtons}>
                  <Button title="Cancelar" color="#888" onPress={() => setRegisterModal(false)} />
                  <Button title="Cadastrar" color="#7c3aed" onPress={handleRegister} />
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 32, color: '#7c3aed' },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  linksContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 18 },
  link: { color: '#7c3aed', fontWeight: 'bold', fontSize: 15, marginHorizontal: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  photoPicker: {
    alignSelf: 'center',
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoText: {
    color: '#888',
    fontSize: 14,
  },
  headerImage: {
    width: 200,
    height: 200,
    borderRadius: 50,
    marginBottom: 24,
  },
});